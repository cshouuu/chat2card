const CHATGPT_HOSTS = new Set(['chatgpt.com', 'www.chatgpt.com', 'chat.openai.com']);
const GEMINI_HOSTS = new Set(['gemini.google.com', 'share.gemini.google', 'g.co']);
const DEEPSEEK_HOSTS = new Set(['chat.deepseek.com']);
const DOUBAO_HOSTS = new Set(['doubao.com', 'www.doubao.com']);
const CLAUDE_HOSTS = new Set(['claude.ai']);
const FETCH_TIMEOUT_MS = 25_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const GEMINI_RPC_ID = 'ujx1Bf';
const GEMINI_BATCH_URL = 'https://gemini.google.com/_/BardChatUi/data/batchexecute';
const JINA_READER = 'https://r.jina.ai/';

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
  if (host === 'chat.deepseek.com' && /^\/share\/[A-Za-z0-9_-]+/.test(url.pathname)) return 'deepseek';
  if (DOUBAO_HOSTS.has(host) && /^\/thread\/[A-Za-z0-9_-]+/.test(url.pathname)) return 'doubao';
  if (host === 'claude.ai' && /^\/share\/[a-f0-9-]{36}/i.test(url.pathname)) return 'claude';
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
  if (contentLength > MAX_RESPONSE_BYTES) throw new ShareParseError('Share page is too large to parse.');
  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) throw new ShareParseError('Share page is too large to parse.');
  return text;
}

async function safeFetch(url, options = {}, allowedHosts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let current = new URL(url);
    for (let i = 0; i < 5; i += 1) {
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

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function safeHttpsUrl(value) {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function inferMimeFromName(name) {
  if (typeof name !== 'string') return undefined;
  const ext = name.toLowerCase().split('.').pop();
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
    pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext];
}

function normalizeAttachment({ type, name, url, mimeType, size, width, height, hidden }) {
  const cleanName = typeof name === 'string' && name.trim() ? name.trim() : undefined;
  const cleanMime = typeof mimeType === 'string' && mimeType.trim() ? mimeType.trim() : inferMimeFromName(cleanName);
  const cleanUrl = safeHttpsUrl(url);
  const inferredType = type === 'image' || cleanMime?.startsWith('image/') ? 'image' : 'file';
  return {
    type: inferredType,
    ...(cleanName ? { name: cleanName } : {}),
    ...(cleanUrl ? { url: cleanUrl } : {}),
    ...(cleanMime ? { mimeType: cleanMime } : {}),
    ...(Number.isFinite(size) ? { size } : {}),
    ...(Number.isFinite(width) ? { width } : {}),
    ...(Number.isFinite(height) ? { height } : {}),
    ...(hidden ? { hidden: true } : {}),
  };
}

function dedupeAttachments(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!item) continue;
    const key = `${item.type}|${item.url || ''}|${item.name || ''}|${item.mimeType || ''}|${item.hidden ? '1' : '0'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
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

// ─── ChatGPT ────────────────────────────────────────────────────────────────

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

function chatGptAttachmentFromObject(record) {
  const contentType = typeof record.content_type === 'string' ? record.content_type : '';
  const mimeType = typeof record.mime_type === 'string' ? record.mime_type : typeof record.mimeType === 'string' ? record.mimeType : undefined;
  const name = typeof record.name === 'string' ? record.name : typeof record.filename === 'string' ? record.filename : typeof record.file_name === 'string' ? record.file_name : undefined;
  const pointer = typeof record.asset_pointer === 'string' ? record.asset_pointer : undefined;
  const url = safeHttpsUrl(record.url) || safeHttpsUrl(record.download_url) || safeHttpsUrl(record.image_url) || safeHttpsUrl(pointer);
  const image = mimeType?.startsWith('image/') || /image/i.test(contentType) || (pointer && /image/i.test(pointer));
  if (!(name || mimeType || pointer || url) || (!image && !/file|attachment|asset/i.test(contentType) && !name)) return null;
  const dims = Array.isArray(record.dimensions) ? record.dimensions : [];
  return normalizeAttachment({
    type: image ? 'image' : 'file', name, url, mimeType,
    size: typeof record.size === 'number' ? record.size : typeof record.size_bytes === 'number' ? record.size_bytes : typeof record.file_size === 'number' ? record.file_size : undefined,
    width: typeof record.width === 'number' ? record.width : typeof dims[0] === 'number' ? dims[0] : undefined,
    height: typeof record.height === 'number' ? record.height : typeof dims[1] === 'number' ? dims[1] : undefined,
  });
}

function collectChatGptAttachments(value, depth = 0, out = []) {
  if (depth > 5 || value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectChatGptAttachments(item, depth + 1, out);
    return out;
  }
  const record = asObject(value);
  if (!record) return out;
  const attachment = chatGptAttachmentFromObject(record);
  if (attachment) out.push(attachment);
  for (const [key, child] of Object.entries(record)) {
    if (key !== 'text') collectChatGptAttachments(child, depth + 1, out);
  }
  return out;
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
    if (message.metadata?.is_visually_hidden_from_conversation === true) continue;
    const contentType = typeof message.content?.content_type === 'string' ? message.content.content_type : '';
    if (/reasoning|thought/i.test(contentType)) continue;

    const parts = Array.isArray(message.content?.parts) ? message.content.parts : [];
    const text = parts
      .map((part) => {
        if (typeof part === 'string') return part;
        if (!part || typeof part !== 'object') return '';
        if (/reasoning|thought/i.test(String(part.content_type || ''))) return '';
        return typeof part.text === 'string' ? part.text : '';
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();
    const attachments = dedupeAttachments([
      ...collectChatGptAttachments(parts),
      ...collectChatGptAttachments(message.metadata?.attachments),
      ...collectChatGptAttachments(message.content?.attachments),
    ]);
    if (text || attachments.length) messages.push({ role, content: text, ...(attachments.length ? { attachments } : {}) });
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

async function fetchChatGptViaJina(rawUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${JINA_READER}${rawUrl}`, {
      signal: controller.signal,
      headers: {
        'X-Engine': 'curl',
        'X-Respond-With': 'html',
        'X-Respond-Timing': 'html',
        'X-No-Cache': 'true',
      },
    });
    if (!response.ok) throw new ShareParseError(`ChatGPT fallback returned HTTP ${response.status}.`);
    return parseChatGptHtml(await readLimitedText(response));
  } finally {
    clearTimeout(timer);
  }
}

export async function parseChatGptShare(rawUrl) {
  try {
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
  } catch (error) {
    try {
      return await fetchChatGptViaJina(rawUrl);
    } catch {
      throw error;
    }
  }
}

// ─── Gemini ─────────────────────────────────────────────────────────────────

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

function collectGeminiAttachments(value, depth = 0, out = []) {
  if (depth > 8 || value == null) return out;
  if (!Array.isArray(value)) return out;

  // Public-share attachment tuple observed in ujx1Bf payloads:
  // [null, type, filename, httpsUrl, ..., mime at 11, ..., [width,height,size]]
  if (
    value.length >= 12 &&
    typeof value[3] === 'string' &&
    safeHttpsUrl(value[3]) &&
    typeof value[11] === 'string' &&
    /^[\w.+-]+\/[\w.+-]+/.test(value[11])
  ) {
    const dims = Array.isArray(value[value.length - 1]) ? value[value.length - 1] : [];
    out.push(normalizeAttachment({
      type: value[11].startsWith('image/') ? 'image' : 'file',
      name: typeof value[2] === 'string' ? value[2] : undefined,
      url: value[3],
      mimeType: value[11],
      width: typeof dims[0] === 'number' ? dims[0] : undefined,
      height: typeof dims[1] === 'number' ? dims[1] : undefined,
      size: typeof dims[2] === 'number' ? dims[2] : undefined,
    }));
    return out;
  }

  for (const child of value) collectGeminiAttachments(child, depth + 1, out);
  return out;
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
    const userAttachments = dedupeAttachments(collectGeminiAttachments(dig(turn, [2, 0, 4])));
    const assistantAttachments = dedupeAttachments(collectGeminiAttachments(dig(turn, [3])));
    if ((typeof user === 'string' && user.trim()) || userAttachments.length) {
      messages.push({ role: 'user', content: typeof user === 'string' ? user.trim() : '', ...(userAttachments.length ? { attachments: userAttachments } : {}) });
    }
    if ((typeof assistant === 'string' && assistant.trim()) || assistantAttachments.length) {
      messages.push({ role: 'assistant', content: typeof assistant === 'string' ? assistant.trim() : '', ...(assistantAttachments.length ? { attachments: assistantAttachments } : {}) });
    }
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
  try {
    const response = await safeFetch(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/150 Safari/537.36' } },
      GEMINI_HOSTS,
    );
    const finalId = extractGeminiShareId(new URL(response.url || url));
    if (finalId) return finalId;
  } catch {
    // Fall through to Jina-based redirect resolution.
  }

  try {
    const response = await fetch(`${JINA_READER}${url.toString()}`, { headers: { 'X-No-Cache': 'true' } });
    const text = await readLimitedText(response);
    const match = text.match(/gemini\.google\.com\/share\/([A-Za-z0-9]+)/);
    if (match) return match[1];
  } catch {
    // Ignore and use direct short id as last resort.
  }
  return directId;
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

// ─── DeepSeek ───────────────────────────────────────────────────────────────

function extractDeepSeekShareId(url) {
  return url.pathname.match(/^\/share\/([A-Za-z0-9_-]+)/)?.[1];
}

export function parseDeepSeekShareJson(payload) {
  const data = payload?.data?.biz_data;
  const rawMessages = Array.isArray(data?.messages) ? data.messages : [];
  const messages = [];
  for (const raw of rawMessages) {
    const role = raw?.role === 'USER' ? 'user' : raw?.role === 'ASSISTANT' ? 'assistant' : null;
    if (!role) continue;
    const content = typeof raw.content === 'string' ? raw.content.trim() : '';
    const files = Array.isArray(raw.files) ? raw.files : [];
    const attachments = files.map((file) => {
      const name = typeof file?.file_name === 'string' ? file.file_name : undefined;
      return normalizeAttachment({
        type: inferMimeFromName(name)?.startsWith('image/') ? 'image' : 'file',
        name,
        mimeType: inferMimeFromName(name),
        size: typeof file?.file_size === 'number' ? file.file_size : undefined,
      });
    });
    // Intentionally ignore thinking_content / thinking_elapsed_secs.
    if (content || attachments.length) {
      messages.push({
        role,
        content,
        ...(attachments.length ? { attachments } : {}),
        ...(typeof raw.inserted_at === 'number' ? { timestamp: new Date(raw.inserted_at * 1000).toISOString() } : {}),
      });
    }
  }
  if (!messages.length) throw new ShareParseError('DeepSeek share data contained no readable messages.');
  const title = typeof data?.title === 'string' && data.title !== 'Shared Conversation' ? data.title.trim() : undefined;
  return { title, messages, source: 'link' };
}

function parseJsonFromJina(text) {
  const marker = 'Markdown Content:';
  const body = text.includes(marker) ? text.slice(text.indexOf(marker) + marker.length).trim() : text.trim();
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new ShareParseError('Proxy returned invalid JSON data.');
  }
}

export async function parseDeepSeekShare(rawUrl) {
  const url = new URL(rawUrl);
  const shareId = extractDeepSeekShareId(url);
  if (!shareId) throw new ShareParseError('Could not resolve DeepSeek share id.');
  const endpoint = `https://chat.deepseek.com/api/v0/share/content?share_id=${encodeURIComponent(shareId)}`;
  const headers = {
    Accept: 'application/json',
    Referer: rawUrl,
    'X-Client-Platform': 'web',
    'X-Client-Version': '1.0.0-always',
    'X-Client-Locale': 'zh-CN',
    'User-Agent': 'Mozilla/5.0 Chrome/150 Safari/537.36',
  };
  try {
    const response = await safeFetch(endpoint, { headers }, DEEPSEEK_HOSTS);
    if (!response.ok) throw new ShareParseError(`DeepSeek share endpoint returned HTTP ${response.status}.`);
    return parseDeepSeekShareJson(JSON.parse(await readLimitedText(response)));
  } catch (primary) {
    try {
      const response = await fetch(`${JINA_READER}${endpoint}`, { headers: { 'X-No-Cache': 'true' } });
      if (!response.ok) throw new ShareParseError(`DeepSeek fallback returned HTTP ${response.status}.`);
      return parseDeepSeekShareJson(parseJsonFromJina(await readLimitedText(response)));
    } catch {
      throw primary;
    }
  }
}

// ─── Doubao ─────────────────────────────────────────────────────────────────

function extractDoubaoShareId(url) {
  return url.pathname.match(/^\/thread\/([A-Za-z0-9_-]+)/)?.[1];
}

function firstHttpsInObject(value, depth = 0) {
  if (depth > 5 || value == null) return undefined;
  if (typeof value === 'string') return safeHttpsUrl(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstHttpsInObject(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === 'object') {
    const priority = ['origin_url', 'url', 'image_url', 'download_url', 'preview_url', 'source_url', 'tiny_url'];
    for (const key of priority) {
      const found = safeHttpsUrl(value[key]);
      if (found) return found;
    }
    for (const child of Object.values(value)) {
      const found = firstHttpsInObject(child, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

function doubaoAttachmentFromValue(value, typeHint = '') {
  const record = asObject(value);
  if (!record) return null;
  const name = typeof record.file_name === 'string' ? record.file_name : typeof record.filename === 'string' ? record.filename : typeof record.name === 'string' ? record.name : undefined;
  const mimeType = typeof record.mime_type === 'string' ? record.mime_type : typeof record.mimeType === 'string' ? record.mimeType : inferMimeFromName(name);
  const url = firstHttpsInObject(record);
  const image = /image/i.test(typeHint) || mimeType?.startsWith('image/');
  if (!name && !url && !mimeType) return null;
  return normalizeAttachment({
    type: image ? 'image' : 'file', name, url, mimeType,
    size: typeof record.file_size === 'number' ? record.file_size : typeof record.size === 'number' ? record.size : undefined,
    width: typeof record.width === 'number' ? record.width : undefined,
    height: typeof record.height === 'number' ? record.height : undefined,
  });
}

function extractDoubaoMessage(raw) {
  let blocks = Array.isArray(raw?.content_block) ? raw.content_block : [];
  if (!blocks.length && typeof raw?.content === 'string') {
    try {
      const parsed = JSON.parse(raw.content);
      if (Array.isArray(parsed)) blocks = parsed;
    } catch {
      // Ignore malformed block serialization.
    }
  }
  const textParts = [];
  const attachments = [];
  const attachmentKeys = [
    'image_block', 'gen_image_block', 'file_block', 'attachment_block', 'local_file_block',
    'rich_media_block', 'dora_image_block', 'artifact_code_file_block', 'image_analysis_block',
  ];
  for (const block of blocks) {
    const content = block?.content;
    if (!content || typeof content !== 'object') continue;
    const text = content.text_block?.text;
    if (typeof text === 'string' && text.trim()) textParts.push(text.trim());
    for (const key of attachmentKeys) {
      if (!content[key]) continue;
      const candidate = doubaoAttachmentFromValue(content[key], key);
      if (candidate) attachments.push(candidate);
    }
  }
  return { content: textParts.join('\n\n').trim(), attachments: dedupeAttachments(attachments) };
}

export function parseDoubaoShareJson(payload) {
  const info = payload?.data?.share_info;
  const rawMessages = payload?.data?.message_snapshot?.message_list;
  if (!Array.isArray(rawMessages)) throw new ShareParseError('Doubao share data contained no message snapshot.');
  const sorted = [...rawMessages].sort((a, b) => Number(a?.index_in_conv || 0) - Number(b?.index_in_conv || 0));
  const messages = [];
  for (const raw of sorted) {
    const role = raw?.user_type === 1 ? 'user' : raw?.user_type === 2 ? 'assistant' : null;
    if (!role) continue;
    // Intentionally ignore raw.thinking_content and thinking_block content.
    const parsed = extractDoubaoMessage(raw);
    if (parsed.content || parsed.attachments.length) {
      messages.push({ role, content: parsed.content, ...(parsed.attachments.length ? { attachments: parsed.attachments } : {}) });
    }
  }
  if (!messages.length) throw new ShareParseError('Doubao share data contained no readable messages.');
  const title = typeof info?.share_name === 'string' && info.share_name.trim() ? info.share_name.trim() : undefined;
  return { title, messages, source: 'link' };
}

export async function parseDoubaoShare(rawUrl) {
  const url = new URL(rawUrl);
  const shareId = extractDoubaoShareId(url);
  if (!shareId) throw new ShareParseError('Could not resolve Doubao share id.');
  const endpoint = 'https://www.doubao.com/im/message/share/get?aid=497858&device_platform=web&samantha_web=1';
  const response = await safeFetch(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; encoding=utf-8',
        Origin: 'https://www.doubao.com',
        Referer: rawUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
      },
      body: JSON.stringify({ share_id: shareId, need_bot_info: true }),
    },
    DOUBAO_HOSTS,
  );
  if (!response.ok) throw new ShareParseError(`Doubao share endpoint returned HTTP ${response.status}.`);
  return parseDoubaoShareJson(JSON.parse(await readLimitedText(response)));
}

// ─── Claude ─────────────────────────────────────────────────────────────────

function stripJinaHeader(md) {
  const marker = 'Markdown Content:';
  return md.includes(marker) ? md.slice(md.indexOf(marker) + marker.length) : md;
}

function isClaudeUiLine(line) {
  const clean = line.replace(/[\uE000-\uF8FF]/g, '').trim();
  if (!clean) return false;
  if (/^(Searched the web|Viewed \d+ files?|Searched .*viewed .*file)/i.test(clean)) return true;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i.test(clean)) return true;
  return false;
}

export function parseClaudeMarkdown(md) {
  const body = stripJinaHeader(md);
  const messages = [];
  let current = null;
  let hiddenAttachment = false;

  const flush = () => {
    if (!current) return;
    const content = current.parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const attachments = current.hiddenAttachment
      ? [normalizeAttachment({ type: 'file', name: '分享平台隐藏的附件', hidden: true })]
      : [];
    if (content || attachments.length) messages.push({ role: current.role, content, ...(attachments.length ? { attachments } : {}) });
    current = null;
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const user = line.match(/^## You said:/);
    const assistant = line.match(/^## Claude responded:/);
    if (user) {
      flush();
      current = { role: 'user', parts: [], hiddenAttachment: false };
      hiddenAttachment = false;
      continue;
    }
    if (assistant) {
      flush();
      current = { role: 'assistant', parts: [], hiddenAttachment: false };
      hiddenAttachment = false;
      continue;
    }
    if (!current) continue;
    if (/^### Files hidden in shared chats\s*$/i.test(line.trim())) {
      current.hiddenAttachment = true;
      hiddenAttachment = true;
      continue;
    }
    if (isClaudeUiLine(line)) continue;
    if (hiddenAttachment && !line.trim()) continue;
    hiddenAttachment = false;
    current.parts.push(line);
  }
  flush();
  if (!messages.length) throw new ShareParseError('Could not parse Claude shared conversation.');
  return { messages, source: 'link' };
}

export async function parseClaudeShare(rawUrl) {
  const response = await fetch(`${JINA_READER}${rawUrl}`, { headers: { 'X-No-Cache': 'true' } });
  if (!response.ok) throw new ShareParseError(`Claude share fallback returned HTTP ${response.status}.`);
  return parseClaudeMarkdown(await readLimitedText(response));
}

// ─── Router ─────────────────────────────────────────────────────────────────

export async function parsePublicShare(rawUrl) {
  const { platform } = assertSafeShareUrl(rawUrl);
  if (platform === 'chatgpt') return parseChatGptShare(rawUrl);
  if (platform === 'gemini') return parseGeminiShare(rawUrl);
  if (platform === 'deepseek') return parseDeepSeekShare(rawUrl);
  if (platform === 'doubao') return parseDoubaoShare(rawUrl);
  if (platform === 'claude') return parseClaudeShare(rawUrl);
  throw new ShareParseError('Unsupported share provider.', 400);
}
