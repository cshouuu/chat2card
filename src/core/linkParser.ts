import { ChatAttachment, ChatMessage, ParsedChat, ParseError, Role } from './types';
import { parseChatGptHtml } from './chatgptShareParser';

/**
 * 分享链接解析器。
 *
 * 五个平台优先通过 parser service 获取结构化对话；ChatGPT / DeepSeek / Claude
 * 另有不依赖主解析服务出口的 Jina fallback。所有解析路径都只保留最终回复，
 * 不把 thinking/reasoning 内容写入分享卡片。
 */

export type SharePlatform = 'claude' | 'deepseek' | 'doubao' | 'chatgpt' | 'gemini' | 'unknown';

const JINA_READER = 'https://r.jina.ai/';
const FETCH_TIMEOUT_MS = 25_000;
const MAX_JINA_HTML_BYTES = 8 * 1024 * 1024;
const PARSER_API = ((import.meta.env.VITE_PARSER_API as string | undefined) || (import.meta.env.DEV ? 'http://localhost:8787' : '')).replace(/\/$/, '');

const PLATFORM_HOSTS: Array<[SharePlatform, RegExp]> = [
  ['claude', /(^|\.)claude\.ai$/i],
  ['deepseek', /(^|\.)deepseek\.com$/i],
  ['doubao', /(^|\.)doubao\.com$/i],
  ['chatgpt', /^(?:www\.)?chatgpt\.com$|^chat\.openai\.com$/i],
  ['gemini', /^(?:gemini\.google\.com|share\.gemini\.google|g\.co)$/i],
];

export const PLATFORM_INFO: Record<SharePlatform, { name: string; support: 'full' | 'best-effort' | 'blocked' }> = {
  claude: { name: 'Claude', support: 'full' },
  deepseek: { name: 'DeepSeek', support: 'full' },
  doubao: { name: '豆包', support: 'full' },
  chatgpt: { name: 'ChatGPT', support: 'full' },
  gemini: { name: 'Gemini', support: 'full' },
  unknown: { name: '未知平台', support: 'best-effort' },
};

export function detectPlatform(url: string): SharePlatform | null {
  try {
    const host = new URL(url).hostname;
    for (const [p, re] of PLATFORM_HOSTS) {
      if (re.test(host)) return p;
    }
    return 'unknown';
  } catch {
    return null;
  }
}

export function isShareLink(text: string): boolean {
  return detectPlatform(text.trim()) !== null;
}

export async function fetchShareMarkdown(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(JINA_READER + encodeURIComponent(url), { signal: controller.signal });
    if (!resp.ok) throw new ParseError(`解析服务暂时不可用(${resp.status}),请稍后重试,或改用粘贴模式。`);
    const text = await resp.text();
    if (!text || text.length < 120) throw new ParseError('未能从该链接获取到对话内容:链接可能已失效,或需要登录。');
    return text;
  } catch (e) {
    if (e instanceof ParseError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') throw new ParseError('解析超时,请稍后重试,或改用粘贴模式。');
    throw new ParseError('网络请求失败,无法访问该链接。请改用粘贴模式。');
  } finally {
    clearTimeout(timer);
  }
}

/** 五个平台统一通过自有 parser service 获取结构化结果。 */
export async function fetchParsedShare(url: string): Promise<ParsedChat> {
  if (!PARSER_API) throw new ParseError('分享链接解析服务尚未配置。请稍后重试或使用粘贴模式。');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(`${PARSER_API}/parse`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const body = (await resp.json().catch(() => null)) as (ParsedChat & { error?: string }) | null;
    if (!resp.ok) throw new ParseError(body?.error || `分享链接解析失败(${resp.status})。`);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) throw new ParseError('解析服务未返回有效的对话内容。');
    return { title: body.title, messages: body.messages, source: 'link' };
  } catch (e) {
    if (e instanceof ParseError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') throw new ParseError('解析超时,请稍后重试,或改用粘贴模式。');
    throw new ParseError('无法连接分享链接解析服务,请稍后重试或改用粘贴模式。');
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchChatGptHtmlViaJina(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(JINA_READER + url, {
      signal: controller.signal,
      headers: {
        'X-Engine': 'curl',
        'X-Respond-With': 'html',
        'X-Respond-Timing': 'html',
        'X-No-Cache': 'true',
      },
    });
    if (!resp.ok) throw new ParseError(`ChatGPT 备用解析服务暂时不可用(${resp.status})。`);
    const declaredLength = Number(resp.headers.get('x-decompressed-content-length') || resp.headers.get('content-length') || 0);
    if (declaredLength > MAX_JINA_HTML_BYTES) throw new ParseError('ChatGPT 分享页内容过大,无法安全解析。');
    const html = await resp.text();
    if (!html || html.length > MAX_JINA_HTML_BYTES) throw new ParseError('ChatGPT 分享页内容为空或过大,无法解析。');
    if (!html.includes('streamController.enqueue')) throw new ParseError('备用解析未获取到 ChatGPT 对话数据。');
    return html;
  } catch (e) {
    if (e instanceof ParseError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') throw new ParseError('ChatGPT 备用解析超时,请稍后重试。');
    throw new ParseError('无法连接 ChatGPT 备用解析服务。');
  } finally {
    clearTimeout(timer);
  }
}

function stripJinaHeader(md: string): string {
  const idx = md.indexOf('Markdown Content:');
  return idx >= 0 ? md.slice(idx + 'Markdown Content:'.length) : md;
}

export function assertNotBlocked(md: string): void {
  const low = md.toLowerCase();
  if (
    low.includes('log in to get answers') ||
    low.includes('sign in to continue') ||
    low.includes('check your internet connection and try again') ||
    md.trim().length < 120
  ) {
    throw new ParseError('该分享链接无法读取:可能需要登录、已被删除,或平台对解析服务开启了反爬。请改用粘贴模式。');
  }
}

function pushMessage(messages: ChatMessage[], role: Role, parts: string[], attachments: ChatAttachment[] = []): void {
  const content = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (content || attachments.length) messages.push({ role, content, ...(attachments.length ? { attachments } : {}) });
}

function isClaudeUiLine(line: string): boolean {
  const clean = line.replace(/[\uE000-\uF8FF]/g, '').trim();
  if (!clean) return false;
  if (/^(Searched the web|Viewed \d+ files?|Searched .*viewed .*file)/i.test(clean)) return true;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i.test(clean)) return true;
  return false;
}

/** Claude:移除日期/工具 UI；分享页隐藏附件时保留明确的附件占位。 */
export function parseClaudeMarkdown(md: string): ParsedChat {
  const body = stripJinaHeader(md);
  const messages: ChatMessage[] = [];
  let current: { role: Role; parts: string[]; hiddenAttachment: boolean } | null = null;

  const flush = () => {
    if (!current) return;
    const attachments: ChatAttachment[] = current.hiddenAttachment
      ? [{ type: 'file', name: '分享平台隐藏的附件', hidden: true }]
      : [];
    pushMessage(messages, current.role, current.parts, attachments);
    current = null;
  };

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^## You said:/.test(line)) {
      flush();
      current = { role: 'user', parts: [], hiddenAttachment: false };
      continue;
    }
    if (/^## Claude responded:/.test(line)) {
      flush();
      current = { role: 'assistant', parts: [], hiddenAttachment: false };
      continue;
    }
    if (!current) continue;
    if (/^### Files hidden in shared chats\s*$/i.test(line.trim())) {
      current.hiddenAttachment = true;
      continue;
    }
    if (isClaudeUiLine(line)) continue;
    current.parts.push(line);
  }
  flush();

  if (messages.length === 0) throw new ParseError('未能从 Claude 分享链接中解析出对话内容。');
  return { messages, source: 'link' };
}

function parseJsonFromJina(text: string): unknown {
  const body = stripJinaHeader(text).trim();
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new ParseError('结构化备用解析返回了无效数据。');
  }
}

function inferAttachment(name?: string, size?: number): ChatAttachment {
  const ext = name?.toLowerCase().split('.').pop();
  const image = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '');
  return { type: image ? 'image' : 'file', ...(name ? { name } : {}), ...(size ? { size } : {}) };
}

export function parseDeepSeekJson(payload: unknown): ParsedChat {
  const root = payload as { data?: { biz_data?: { title?: string; messages?: unknown[] } } };
  const data = root?.data?.biz_data;
  const rawMessages = Array.isArray(data?.messages) ? data.messages : [];
  const messages: ChatMessage[] = [];

  for (const item of rawMessages) {
    const raw = item as { role?: string; content?: string; files?: Array<{ file_name?: string; file_size?: number }>; inserted_at?: number };
    const role: Role | null = raw.role === 'USER' ? 'user' : raw.role === 'ASSISTANT' ? 'assistant' : null;
    if (!role) continue;
    const content = typeof raw.content === 'string' ? raw.content.trim() : '';
    const attachments = (raw.files ?? []).map((file) => inferAttachment(file.file_name, file.file_size));
    // thinking_content intentionally never read here.
    if (content || attachments.length) {
      messages.push({
        role,
        content,
        ...(attachments.length ? { attachments } : {}),
        ...(typeof raw.inserted_at === 'number' ? { timestamp: new Date(raw.inserted_at * 1000).toISOString() } : {}),
      });
    }
  }
  if (!messages.length) throw new ParseError('DeepSeek 分享数据中没有可读消息。');
  const title = typeof data?.title === 'string' && data.title !== 'Shared Conversation' ? data.title.trim() : undefined;
  return { title, messages, source: 'link' };
}

export async function fetchDeepSeekViaJina(url: string): Promise<ParsedChat> {
  const parsed = new URL(url);
  const shareId = parsed.pathname.match(/^\/share\/([A-Za-z0-9_-]+)/)?.[1];
  if (!shareId) throw new ParseError('DeepSeek 分享链接格式无效。');
  const endpoint = `https://chat.deepseek.com/api/v0/share/content?share_id=${encodeURIComponent(shareId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${JINA_READER}${endpoint}`, { signal: controller.signal, headers: { 'X-No-Cache': 'true' } });
    if (!response.ok) throw new ParseError(`DeepSeek 备用解析失败(${response.status})。`);
    return parseDeepSeekJson(parseJsonFromJina(await response.text()));
  } finally {
    clearTimeout(timer);
  }
}

/** 仅作为服务端不可用时的豆包保底；不会解析/暴露思考过程。 */
export function parseDoubaoMarkdown(md: string, pageTitle?: string): ParsedChat {
  const body = stripJinaHeader(md).trim();
  if (/^Thought for [\d.]+/m.test(body)) {
    throw new ParseError('豆包备用页面包含思考区块，为避免把思考过程写入卡片，已停止使用该备用结果。');
  }
  let userText = (pageTitle || '').replace(/\s*[-–—]\s*豆包\s*$/i, '').trim();
  if (!userText) {
    const titleMatch = md.match(/^Title:\s*(.+)$/m);
    userText = (titleMatch?.[1] || '').replace(/\s*[-–—]\s*豆包\s*$/i, '').trim();
  }
  if (!body || !userText) throw new ParseError('豆包分享页解析失败(内容不完整),请稍后重试。');
  return { title: userText, messages: [{ role: 'user', content: userText }, { role: 'assistant', content: body }], source: 'link' };
}

export async function parseShareLink(url: string): Promise<ParsedChat> {
  const trimmed = url.trim();
  const platform = detectPlatform(trimmed);
  if (platform === null) throw new ParseError('这不是一个有效的链接。');
  if (platform === 'unknown') throw new ParseError('暂不支持解析该平台的分享链接,请改用粘贴模式。');

  try {
    return await fetchParsedShare(trimmed);
  } catch (primaryError) {
    try {
      if (platform === 'chatgpt') return parseChatGptHtml(await fetchChatGptHtmlViaJina(trimmed));
      if (platform === 'deepseek') return await fetchDeepSeekViaJina(trimmed);
      if (platform === 'claude') {
        const md = await fetchShareMarkdown(trimmed);
        assertNotBlocked(md);
        return parseClaudeMarkdown(md);
      }
      if (platform === 'doubao') {
        const md = await fetchShareMarkdown(trimmed);
        assertNotBlocked(md);
        return parseDoubaoMarkdown(md);
      }
    } catch (fallbackError) {
      const primary = primaryError instanceof Error ? primaryError.message : '主解析失败';
      const fallback = fallbackError instanceof Error ? fallbackError.message : '备用解析失败';
      throw new ParseError(`${PLATFORM_INFO[platform].name} 分享链接解析失败。主解析: ${primary} 备用解析: ${fallback}`);
    }
    throw primaryError;
  }
}
