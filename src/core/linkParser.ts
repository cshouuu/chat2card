import { ChatMessage, ParsedChat, ParseError, Role } from './types';

/**
 * 分享链接解析器。
 *
 * Claude / DeepSeek / 豆包继续通过 Jina Reader 转 Markdown；ChatGPT / Gemini
 * 使用独立 parser service，因为这两家的公开分享内容不在普通 HTML 正文里。
 */

export type SharePlatform = 'claude' | 'deepseek' | 'doubao' | 'chatgpt' | 'gemini' | 'unknown';

const JINA_READER = 'https://r.jina.ai/';
const FETCH_TIMEOUT_MS = 25_000;
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
  deepseek: { name: 'DeepSeek', support: 'best-effort' },
  doubao: { name: '豆包', support: 'best-effort' },
  chatgpt: { name: 'ChatGPT', support: 'best-effort' },
  gemini: { name: 'Gemini', support: 'best-effort' },
  unknown: { name: '未知平台', support: 'best-effort' },
};

/** 根据 URL host 识别分享平台;不是合法 URL 返回 null */
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

/** 判断输入是否看起来像分享链接 */
export function isShareLink(text: string): boolean {
  return detectPlatform(text.trim()) !== null;
}

/** 通过 Jina Reader 抓取分享页并返回 markdown 文本 */
export async function fetchShareMarkdown(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(JINA_READER + encodeURIComponent(url), { signal: controller.signal });
    if (!resp.ok) {
      throw new ParseError(`解析服务暂时不可用(${resp.status}),请稍后重试,或改用粘贴模式。`);
    }
    const text = await resp.text();
    if (!text || text.length < 200) {
      throw new ParseError('未能从该链接获取到对话内容:链接可能已失效,或需要登录。');
    }
    return text;
  } catch (e) {
    if (e instanceof ParseError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ParseError('解析超时,请稍后重试,或改用粘贴模式。');
    }
    throw new ParseError('网络请求失败,无法访问该链接。请改用粘贴模式。');
  } finally {
    clearTimeout(timer);
  }
}

/** ChatGPT / Gemini 通过自有 parser service 解析公开分享数据 */
export async function fetchParsedShare(url: string): Promise<ParsedChat> {
  if (!PARSER_API) {
    throw new ParseError(
      'ChatGPT / Gemini 链接解析服务尚未配置。部署 parser-service 后设置 VITE_PARSER_API 即可启用；也可以先使用粘贴模式。',
    );
  }

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
    if (!resp.ok) {
      throw new ParseError(body?.error || `分享链接解析失败(${resp.status})。`);
    }
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ParseError('解析服务未返回有效的对话内容。');
    }
    return { title: body.title, messages: body.messages, source: 'link' };
  } catch (e) {
    if (e instanceof ParseError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ParseError('解析超时,请稍后重试,或改用粘贴模式。');
    }
    throw new ParseError('无法连接分享链接解析服务,请稍后重试或改用粘贴模式。');
  } finally {
    clearTimeout(timer);
  }
}

/** 剔除 Jina 输出的元信息头部(Title / URL Source / Markdown Content:) */
function stripJinaHeader(md: string): string {
  const idx = md.indexOf('Markdown Content:');
  return idx >= 0 ? md.slice(idx + 'Markdown Content:'.length) : md;
}

/** 通用"被拦截"检测:登录墙 / 反爬 / 空内容 */
export function assertNotBlocked(md: string): void {
  const low = md.toLowerCase();
  if (
    low.includes('log in to get answers') ||
    low.includes('sign in to continue') ||
    low.includes('check your internet connection and try again') ||
    md.trim().length < 150
  ) {
    throw new ParseError(
      '该分享链接无法读取:可能需要登录、已被删除,或平台对解析服务开启了反爬。\n建议:用该平台的"导出/复制对话"功能,粘贴文本或 JSON 到本工具。',
    );
  }
}

function pushMessage(messages: ChatMessage[], role: Role, parts: string[]): void {
  const content = parts.join('\n').trim();
  if (content) messages.push({ role, content });
}

/** Claude 分享页:## You said: / ## Claude responded: */
export function parseClaudeMarkdown(md: string): ParsedChat {
  const body = stripJinaHeader(md);
  const messages: ChatMessage[] = [];
  let current: { role: Role; parts: string[] } | null = null;

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const u = line.match(/^## You said:\s*(.*)$/);
    const a = line.match(/^## Claude responded:\s*(.*)$/);
    if (u) {
      if (current) pushMessage(messages, current.role, current.parts);
      current = { role: 'user', parts: u[1].trim() ? [u[1].trim()] : [] };
    } else if (a) {
      if (current) pushMessage(messages, current.role, current.parts);
      current = { role: 'assistant', parts: a[1].trim() ? [a[1].trim()] : [] };
    } else if (current) {
      current.parts.push(line);
    }
  }
  if (current) pushMessage(messages, current.role, current.parts);

  if (messages.length === 0) {
    throw new ParseError('未能从链接中解析出对话内容,请改用粘贴模式。');
  }
  return { messages, source: 'link' };
}

/** DeepSeek 分享页(尽力解析) */
export function parseDeepSeekMarkdown(md: string): ParsedChat {
  const body = stripJinaHeader(md).trimStart();
  let cleaned = body;
  const headPatterns = [
    /^Shared Conversation\s*\n?/,
    /^Expert\s*\n?/,
    /^This shared conversation is generated by AI, for reference only\.\s*\n?/,
    /^Report\s*\n?/,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const pat of headPatterns) {
      const next = cleaned.replace(pat, '');
      if (next !== cleaned) {
        cleaned = next;
        changed = true;
      }
    }
  }
  cleaned = cleaned.trim();

  const thoughtMatch = cleaned.match(/^Thought for [\d.]+ (?:seconds|minutes)\s*$/m);
  if (!thoughtMatch || thoughtMatch.index === undefined) {
    throw new ParseError('DeepSeek 分享页解析失败(未识别到消息结构),请改用粘贴模式。');
  }

  const userText = cleaned.slice(0, thoughtMatch.index).trim();
  const afterThought = cleaned.slice(thoughtMatch.index + thoughtMatch[0].length).trim();
  if (!userText || !afterThought) {
    throw new ParseError('DeepSeek 分享页解析失败(内容不完整),请改用粘贴模式。');
  }

  return {
    messages: [
      { role: 'user', content: userText },
      { role: 'assistant', content: afterThought },
    ],
    source: 'link',
  };
}

/** 豆包分享页(尽力解析) */
export function parseDoubaoMarkdown(md: string, pageTitle?: string): ParsedChat {
  const body = stripJinaHeader(md).trim();
  let userText = (pageTitle || '').replace(/\s*[-–—]\s*豆包\s*$/i, '').trim();
  if (!userText) {
    const titleMatch = md.match(/^Title:\s*(.+)$/m);
    userText = (titleMatch?.[1] || '').replace(/\s*[-–—]\s*豆包\s*$/i, '').trim();
  }
  if (!body || !userText) {
    throw new ParseError('豆包分享页解析失败(内容不完整),请改用粘贴模式。');
  }
  return {
    title: userText,
    messages: [
      { role: 'user', content: userText },
      { role: 'assistant', content: body },
    ],
    source: 'link',
  };
}

/** 通用解析入口:平台路由 + 抓取 + 解析 */
export async function parseShareLink(url: string): Promise<ParsedChat> {
  const trimmed = url.trim();
  const platform = detectPlatform(trimmed);
  if (platform === null) {
    throw new ParseError('这不是一个有效的链接。');
  }

  if (platform === 'chatgpt' || platform === 'gemini') {
    return fetchParsedShare(trimmed);
  }

  const md = await fetchShareMarkdown(trimmed);
  assertNotBlocked(md);

  switch (platform) {
    case 'claude':
      return parseClaudeMarkdown(md);
    case 'deepseek':
      return parseDeepSeekMarkdown(md);
    case 'doubao':
      return parseDoubaoMarkdown(md);
    default:
      throw new ParseError('暂不支持解析该平台的分享链接,请改用粘贴模式。');
  }
}
