import { ChatAttachment, ChatMessage, ParsedChat, ParseError } from './types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function findKey(value: unknown, target: string, depth = 0): unknown {
  if (depth > 60 || value == null) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findKey(item, target, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = asRecord(value);
  if (record) {
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
  const record = asRecord(part);
  if (!record) return '';
  const contentType = typeof record.content_type === 'string' ? record.content_type : '';
  if (/reasoning|thought/i.test(contentType)) return '';
  return typeof record.text === 'string' ? record.text : '';
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function readNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function attachmentFromRecord(record: UnknownRecord): ChatAttachment | null {
  const contentType = typeof record.content_type === 'string' ? record.content_type : '';
  const mimeType =
    typeof record.mime_type === 'string'
      ? record.mime_type
      : typeof record.mimeType === 'string'
        ? record.mimeType
        : undefined;
  const name =
    typeof record.name === 'string'
      ? record.name
      : typeof record.filename === 'string'
        ? record.filename
        : typeof record.file_name === 'string'
          ? record.file_name
          : undefined;
  const assetPointer = typeof record.asset_pointer === 'string' ? record.asset_pointer : undefined;
  const url =
    safeHttpsUrl(record.url) ||
    safeHttpsUrl(record.download_url) ||
    safeHttpsUrl(record.image_url) ||
    safeHttpsUrl(assetPointer);

  const looksLikeImage =
    mimeType?.startsWith('image/') === true ||
    /image/i.test(contentType) ||
    (typeof assetPointer === 'string' && /image/i.test(assetPointer));
  const looksLikeFile =
    Boolean(name || mimeType || assetPointer || url) &&
    (looksLikeImage || /file|attachment|asset/i.test(contentType) || Boolean(name));
  if (!looksLikeFile) return null;

  const dimensions = Array.isArray(record.dimensions) ? record.dimensions : undefined;
  const width = readNumber(record, ['width']) ?? (typeof dimensions?.[0] === 'number' ? dimensions[0] : undefined);
  const height = readNumber(record, ['height']) ?? (typeof dimensions?.[1] === 'number' ? dimensions[1] : undefined);
  return {
    type: looksLikeImage ? 'image' : 'file',
    name,
    url,
    mimeType,
    size: readNumber(record, ['size', 'size_bytes', 'file_size']),
    width,
    height,
  };
}

function collectAttachments(value: unknown, depth = 0, out: ChatAttachment[] = []): ChatAttachment[] {
  if (depth > 5 || value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectAttachments(item, depth + 1, out);
    return out;
  }
  const record = asRecord(value);
  if (!record) return out;
  const attachment = attachmentFromRecord(record);
  if (attachment) out.push(attachment);
  for (const [key, child] of Object.entries(record)) {
    if (key === 'text') continue;
    collectAttachments(child, depth + 1, out);
  }
  return out;
}

function dedupeAttachments(items: ChatAttachment[]): ChatAttachment[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}|${item.url ?? ''}|${item.name ?? ''}|${item.mimeType ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeMessages(data: unknown): ChatMessage[] {
  const linear = findKey(data, 'linear_conversation');
  const rawMessages = Array.isArray(linear)
    ? linear.map((node) => (node && typeof node === 'object' ? (node as UnknownRecord).message : null))
    : findKey(data, 'messages');

  if (!Array.isArray(rawMessages)) return [];

  const messages: ChatMessage[] = [];
  for (const raw of rawMessages) {
    const message = asRecord(raw);
    if (!message) continue;
    const author = asRecord(message.author);
    const content = asRecord(message.content);
    const metadata = asRecord(message.metadata);
    if (!author || !content) continue;

    const role = author.role;
    if (role !== 'user' && role !== 'assistant') continue;
    if (metadata?.is_visually_hidden_from_conversation === true) continue;

    const contentType = typeof content.content_type === 'string' ? content.content_type : '';
    if (/reasoning|thought/i.test(contentType)) continue;

    const parts = Array.isArray(content.parts) ? content.parts : [];
    const text = parts.map(readTextPart).filter(Boolean).join('\n\n').trim();
    const attachments = dedupeAttachments([
      ...collectAttachments(parts),
      ...collectAttachments(metadata?.attachments),
      ...collectAttachments(content.attachments),
    ]);

    if (text || attachments.length > 0) {
      messages.push({
        role,
        content: text,
        ...(attachments.length > 0 ? { attachments } : {}),
      });
    }
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
 * Reasoning-only/hidden messages are intentionally excluded from the card.
 */
export function parseChatGptHtml(html: string): ParsedChat {
  for (const pool of extractTurboPools(html)) {
    const data = hydrateTurboStream(pool, 0);
    const messages = normalizeMessages(data);
    if (messages.length === 0) continue;

    const routeTitle = findKey(data, 'title');
    const title =
      extractDocumentTitle(html) ||
      (typeof routeTitle === 'string' && routeTitle.trim() ? routeTitle.trim() : undefined);

    return { title, messages, source: 'link' };
  }

  throw new ParseError('未能从 ChatGPT 分享页中解析出对话内容。');
}
