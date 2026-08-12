import { ChatMessage, ParsedChat, ParseError } from './types';

type UnknownRecord = Record<string, unknown>;

function findKey(value: unknown, target: string, depth = 0): unknown {
  if (depth > 60 || value == null) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findKey(item, target, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (typeof value === 'object') {
    const record = value as UnknownRecord;
    if (Object.prototype.hasOwnProperty.call(record, target)) return record[target];
    for (const item of Object.values(record)) {
      const found = findKey(item, target, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function hydrateTurboStream(pool: unknown[], index: unknown, depth = 0): unknown {
  if (depth > 80 || !Number.isInteger(index) || (index as number) < 0 || (index as number) >= pool.length) {
    return null;
  }

  const value = pool[index as number];
  if (Array.isArray(value)) {
    // React Router uses arrays beginning with a string as typed markers
    // (Promise/Date/etc.), not ordinary indexed arrays.
    if (value.length > 0 && typeof value[0] === 'string') return null;
    return value.map((item) => hydrateTurboStream(pool, item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const output: UnknownRecord = {};
    for (const [encodedKey, encodedValue] of Object.entries(value as UnknownRecord)) {
      const keyIndex = encodedKey.startsWith('_') ? Number(encodedKey.slice(1)) : Number.NaN;
      const key = Number.isInteger(keyIndex) ? pool[keyIndex] : null;
      if (typeof key === 'string') {
        output[key] = hydrateTurboStream(pool, encodedValue, depth + 1);
      }
    }
    return output;
  }

  return value;
}

function extractTurboPools(html: string): unknown[][] {
  const pools: unknown[][] = [];
  const pattern = /streamController\.enqueue\(("(?:\\.|[^"\\])*")\);<\/script>/gs;

  for (const match of html.matchAll(pattern)) {
    try {
      const decoded = JSON.parse(match[1]) as string;
      const pool = JSON.parse(decoded) as unknown;
      if (Array.isArray(pool) && pool.length > 0) pools.push(pool);
    } catch {
      // A page can contain several stream chunks. Ignore malformed/non-data chunks.
    }
  }

  return pools;
}

function readTextPart(part: unknown): string {
  if (typeof part === 'string') return part;
  if (part && typeof part === 'object') {
    const text = (part as UnknownRecord).text;
    if (typeof text === 'string') return text;
  }
  return '';
}

function normalizeMessages(data: unknown): ChatMessage[] {
  const linear = findKey(data, 'linear_conversation');
  const rawMessages = Array.isArray(linear)
    ? linear.map((node) =>
        node && typeof node === 'object' ? (node as UnknownRecord).message : null,
      )
    : findKey(data, 'messages');

  if (!Array.isArray(rawMessages)) return [];

  const messages: ChatMessage[] = [];
  for (const raw of rawMessages) {
    if (!raw || typeof raw !== 'object') continue;
    const message = raw as UnknownRecord;
    const author = message.author;
    const content = message.content;
    if (!author || typeof author !== 'object' || !content || typeof content !== 'object') continue;

    const role = (author as UnknownRecord).role;
    if (role !== 'user' && role !== 'assistant') continue;

    const parts = (content as UnknownRecord).parts;
    if (!Array.isArray(parts)) continue;

    const text = parts.map(readTextPart).filter(Boolean).join('\n\n').trim();
    if (text) messages.push({ role, content: text });
  }

  return messages;
}

function extractDocumentTitle(html: string): string | undefined {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (!match) return undefined;
  const value = match[1].trim().replace(/^ChatGPT\s*[-–—]\s*/i, '').trim();
  return value || undefined;
}

/**
 * Decode the React Router turbo-stream embedded in a public ChatGPT share page.
 * Supports both /share/<id> (linear_conversation) and /s/<id> (flat messages).
 */
export function parseChatGptHtml(html: string): ParsedChat {
  for (const pool of extractTurboPools(html)) {
    const data = hydrateTurboStream(pool, 0);
    const messages = normalizeMessages(data);
    if (messages.length === 0) continue;

    const routeTitle = findKey(data, 'title');
    const title = extractDocumentTitle(html) ||
      (typeof routeTitle === 'string' && routeTitle.trim() ? routeTitle.trim() : undefined);

    return { title, messages, source: 'link' };
  }

  throw new ParseError('未能从 ChatGPT 分享页中解析出对话内容。');
}
