const CHATGPT_HOSTS = new Set(['chatgpt.com', 'www.chatgpt.com', 'chat.openai.com']);
const GEMINI_HOSTS = new Set(['gemini.google.com', 'share.gemini.google', 'g.co']);
const FETCH_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const GEMINI_RPC_ID = 'ujx1Bf';
const GEMINI_BATCH_URL = 'https://gemini.google.com/_/BardChatUi/data/batchexecute';

export class ShareParseError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'ShareParseError';
    this.status = status;
  }
}

export function detectServerPlatform(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (CHATGPT_HOSTS.has(host) && /^\/(?:share|s)\/[A-Za-z0-9_-]+/.test(url.pathname)) return 'chatgpt';
  if (host === 'gemini.google.com' && /^\/share\/[A-Za-z0-9]+/.test(url.pathname)) return 'gemini';
  if (host === 'share.gemini.google' && /^\/[A-Za-z0-9]+/.test(url.pathname)) return 'gemini';
  if (host === 'g.co' && /^\/gemini\/share\/[A-Za-z0-9]+/.test(url.pathname)) return 'gemini';
  return 'unknown';
}

function assertSafeShareUrl(rawUrl) {
  const platform = detectServerPlatform(rawUrl);
  if (!platform || platform === 'unknown') {
    throw new ShareParseError('Unsupported or invalid share URL.', 400);
  }
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') throw new ShareParseError('Only HTTPS share links are accepted.', 400);
  if (url.username || url.password) throw new ShareParseError('Credentials in URLs are not allowed.', 400);
  return { platform, url };
}

async function readLimitedText(response) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new ShareParseError('Share page is too large to parse.');
  }
  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new ShareParseError('Share page is too large to parse.');
  }
  return text;
}

async function safeFetch(url, options = {}, allowedHosts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let current = new URL(url);
    for (let i = 0; i < 4; i += 1) {
      if (current.protocol !== 'https:' || !allowedHosts.has(current.hostname.toLowerCase())) {
        throw new ShareParseError('Share URL redirected to an untrusted host.', 400);
      }
      const response = await fetch(current, { ...options, redirect: 'manual', signal: controller.signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new ShareParseError('Invalid redirect from share provider.');
        current = new URL(location, current);
        continue;
      }
      return response;
    }
    throw new ShareParseError('Too many redirects from share provider.');
  } catch (error) {
    if (error?.name === 'AbortError') throw new ShareParseError('Share provider request timed out.', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function findKey(value, target, depth = 0) {
  if (depth > 60 || value == null) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findKey(item, target, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, target)) return value[target];
    for (const item of Object.values(value)) {
      const found = findKey(item, target, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function hydrateTurboStream(pool, index, depth = 0) {
  if (depth > 80 || !Number.isInteger(index) || index < 0 || index >= pool.length) return null;
  const value = pool[index];
  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === 'string') return null;
    return value.map((item) => hydrateTurboStream(pool, item, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [encodedKey, encodedValue] of Object.entries(value)) {
      const keyIndex = encodedKey.startsWith('_') ? Number(encodedKey.slice(1)) : NaN;
      const key = Number.isInteger(keyIndex) ? pool[keyIndex] : null;
      if (typeof key === 'string') out[key] = hydrateTurboStream(pool, encodedValue, depth + 1);
    }
    return out;
  }
  return value;
}

function extractTurboPools(html) {
  const pools = [];
  const re = /streamController\.enqueue\(("(?:\\.|[^"\\])*")\);<\/script>/gs;
  for (const match of html.matchAll(re)) {
    try {
      const decodedString = JSON.parse(match[1]);
      const pool = JSON.parse(decodedString);
      if (Array.isArray(pool) && pool.length) pools.push(pool);
    } catch {
      // Ignore malformed chunks and keep scanning.
    }
  }
  return pools;
}

function normalizeChatGptMessages(data) {
  const linear = findKey(data, 'linear_conversation');
  const raw = Array.isArray(linear)
    ? linear.map((node) => (node && typeof node === 'object' ? node.message : null))
    : findKey(data, 'messages');
  if (!Array.isArray(raw)) return [];

  const messages = [];
  for (const message of raw) {
    if (!message || typeof message !== 'object') continue;
    const role = message.author?.role;
    if (role !== 'user' && role !== 'assistant') continue;
    const parts = Array.isArray(message.content?.parts) ? message.content.parts : [];
    const text = parts
      .map((part) => (typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (text) messages.push({ role, content: text });
  }
  return messages;
}

export function parseChatGptHtml(html) {
  for (const pool of extractTurboPools(html)) {
    const data = hydrateTurboStream(pool, 0);
    const messages = normalizeChatGptMessages(data);
    if (!messages.length) continue;
    const title = findKey(data, 'title');
    return {
      title: typeof title === 'string' && title.trim() ? title.trim() : undefined,
      messages,
      source: 'link',
    };
  }
  throw new ShareParseError('Could not find a ChatGPT conversation in this public share page.');
}

export async function parseChatGptShare(rawUrl) {
  const response = await safeFetch(
    rawUrl,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    },
    CHATGPT_HOSTS,
  );
  if (!response.ok) throw new ShareParseError(`ChatGPT share page returned HTTP ${response.status}.`);
  return parseChatGptHtml(await readLimitedText(response));
}

function dig(value, path) {
  let current = value;
  for (const index of path) {
    if (!Array.isArray(current) || index < 0 || index >= current.length) return undefined;
    current = current[index];
  }
  return current;
}

export function decodeGeminiEnvelope(text) {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[[')) continue;
    let chunk;
    try {
      chunk = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!Array.isArray(chunk)) continue;
    for (const entry of chunk) {
      if (!Array.isArray(entry) || entry[0] !== 'wrb.fr' || entry[1] !== GEMINI_RPC_ID) continue;
      if (typeof entry[2] !== 'string') continue;
      try {
        return JSON.parse(entry[2]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function parseGeminiBatchExecute(text) {
  const payload = decodeGeminiEnvelope(text);
  const root = Array.isArray(payload) ? payload[0] : undefined;
  const turns = dig(root, [1]);
  if (!Array.isArray(turns)) throw new ShareParseError('Could not decode Gemini shared conversation data.');

  const titleValue = dig(root, [2, 1]);
  const messages = [];
  for (const turn of turns) {
    const user = dig(turn, [2, 0, 0]);
    const assistant = dig(turn, [3, 0, 0, 1, 0]);
    if (typeof user === 'string' && user.trim()) messages.push({ role: 'user', content: user.trim() });
    if (typeof assistant === 'string' && assistant.trim()) messages.push({ role: 'assistant', content: assistant.trim() });
  }
  if (!messages.length) throw new ShareParseError('Gemini share data contained no readable messages.');
  return {
    title: typeof titleValue === 'string' && titleValue.trim() ? titleValue.trim() : undefined,
    messages,
    source: 'link',
  };
}

function extractGeminiShareId(url) {
  if (url.hostname === 'gemini.google.com') return url.pathname.match(/^\/share\/([A-Za-z0-9]+)/)?.[1];
  if (url.hostname === 'share.gemini.google') return url.pathname.match(/^\/([A-Za-z0-9]+)/)?.[1];
  if (url.hostname === 'g.co') return url.pathname.match(/^\/gemini\/share\/([A-Za-z0-9]+)/)?.[1];
  return undefined;
}

async function resolveGeminiShareId(url) {
  const directId = extractGeminiShareId(url);
  if (url.hostname === 'gemini.google.com') return directId;
  const response = await safeFetch(
    url,
    { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/150 Safari/537.36' } },
    GEMINI_HOSTS,
  );
  const finalId = extractGeminiShareId(new URL(response.url || url));
  return finalId || directId;
}

export async function parseGeminiShare(rawUrl) {
  const url = new URL(rawUrl);
  const shareId = await resolveGeminiShareId(url);
  if (!shareId) throw new ShareParseError('Could not resolve Gemini share id.');

  const inner = JSON.stringify([null, shareId, [4]]);
  const fReq = JSON.stringify([[[GEMINI_RPC_ID, inner, null, 'generic']]]);
  const endpoint = `${GEMINI_BATCH_URL}?rpcids=${GEMINI_RPC_ID}&source-path=${encodeURIComponent(`/share/${shareId}`)}&rt=c`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
      },
      body: new URLSearchParams({ 'f.req': fReq }),
    });
    if (!response.ok) throw new ShareParseError(`Gemini share endpoint returned HTTP ${response.status}.`);
    return parseGeminiBatchExecute(await readLimitedText(response));
  } catch (error) {
    if (error?.name === 'AbortError') throw new ShareParseError('Gemini share request timed out.', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function parsePublicShare(rawUrl) {
  const { platform } = assertSafeShareUrl(rawUrl);
  if (platform === 'chatgpt') return parseChatGptShare(rawUrl);
  if (platform === 'gemini') return parseGeminiShare(rawUrl);
  throw new ShareParseError('Unsupported share provider.', 400);
}
