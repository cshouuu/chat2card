import { ShareParseError } from '../parsers.mjs';

const ENDPOINT = 'https://www.doubao.com/im/message/share/get?aid=497858&device_platform=web&samantha_web=1';
const TIMEOUT_MS = 25_000;
const MAX_BYTES = 8 * 1024 * 1024;

function safeHttpsUrl(value) {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function inferMime(name) {
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

function firstHttps(value, depth = 0) {
  if (depth > 6 || value == null) return undefined;
  if (typeof value === 'string') return safeHttpsUrl(value);
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = firstHttps(child, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value !== 'object') return undefined;
  for (const key of ['origin_url', 'url', 'image_url', 'download_url', 'preview_url', 'source_url', 'tiny_url']) {
    const found = safeHttpsUrl(value[key]);
    if (found) return found;
  }
  for (const child of Object.values(value)) {
    const found = firstHttps(child, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function attachmentFromBlock(value, typeHint = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const name =
    typeof value.file_name === 'string' ? value.file_name :
    typeof value.filename === 'string' ? value.filename :
    typeof value.name === 'string' ? value.name : undefined;
  const mimeType =
    typeof value.mime_type === 'string' ? value.mime_type :
    typeof value.mimeType === 'string' ? value.mimeType : inferMime(name);
  const url = firstHttps(value);
  const isImage = /image/i.test(typeHint) || mimeType?.startsWith('image/');
  if (!name && !mimeType && !url) return null;
  return {
    type: isImage ? 'image' : 'file',
    ...(name ? { name } : {}),
    ...(url ? { url } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(typeof value.file_size === 'number' ? { size: value.file_size } : typeof value.size === 'number' ? { size: value.size } : {}),
    ...(typeof value.width === 'number' ? { width: value.width } : {}),
    ...(typeof value.height === 'number' ? { height: value.height } : {}),
  };
}

function dedupeAttachments(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}|${item.url || ''}|${item.name || ''}|${item.mimeType || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function decodeBlocks(raw) {
  if (Array.isArray(raw?.content_block) && raw.content_block.length) return raw.content_block;
  if (typeof raw?.content !== 'string') return [];
  const trimmed = raw.content.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractMessage(raw) {
  const blocks = decodeBlocks(raw);
  const textParts = [];
  const attachments = [];
  const attachmentKeys = [
    'image_block', 'gen_image_block', 'file_block', 'attachment_block', 'local_file_block',
    'rich_media_block', 'dora_image_block', 'artifact_code_file_block', 'image_analysis_block',
  ];

  for (const block of blocks) {
    const content = block?.content;
    if (!content || typeof content !== 'object') continue;
    // Deliberately do NOT read thinking_block / raw.thinking_content.
    const text = content.text_block?.text;
    if (typeof text === 'string' && text.trim()) textParts.push(text.trim());
    for (const key of attachmentKeys) {
      if (!content[key]) continue;
      const attachment = attachmentFromBlock(content[key], key);
      if (attachment) attachments.push(attachment);
    }
  }

  // Real Doubao USER messages commonly have an empty content_block and put the
  // literal prompt directly in `content`. Do not JSON-parse-or-drop that text.
  if (!textParts.length && typeof raw?.content === 'string') {
    const plain = raw.content.trim();
    if (plain && !plain.startsWith('[') && !plain.startsWith('{')) textParts.push(plain);
  }

  return { content: textParts.join('\n\n').trim(), attachments: dedupeAttachments(attachments) };
}

export function parseDoubaoPayload(payload) {
  const info = payload?.data?.share_info;
  const rawMessages = payload?.data?.message_snapshot?.message_list;
  if (!Array.isArray(rawMessages)) throw new ShareParseError('Doubao share data contained no message snapshot.');

  const messages = [];
  const sorted = [...rawMessages].sort((a, b) => Number(a?.index_in_conv || 0) - Number(b?.index_in_conv || 0));
  for (const raw of sorted) {
    const role = raw?.user_type === 1 ? 'user' : raw?.user_type === 2 ? 'assistant' : null;
    if (!role) continue;
    const parsed = extractMessage(raw);
    if (parsed.content || parsed.attachments.length) {
      messages.push({ role, content: parsed.content, ...(parsed.attachments.length ? { attachments: parsed.attachments } : {}) });
    }
  }

  if (!messages.length) throw new ShareParseError('Doubao share data contained no readable messages.');
  const title = typeof info?.share_name === 'string' && info.share_name.trim() ? info.share_name.trim() : undefined;
  return { title, messages, source: 'link' };
}

export async function parseDoubaoShare(rawUrl) {
  let shareId;
  try {
    const url = new URL(rawUrl);
    if (!['doubao.com', 'www.doubao.com'].includes(url.hostname.toLowerCase())) throw new Error('host');
    shareId = url.pathname.match(/^\/thread\/([A-Za-z0-9_-]+)/)?.[1];
  } catch {
    // handled below
  }
  if (!shareId) throw new ShareParseError('Could not resolve Doubao share id.', 400);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json; encoding=utf-8',
        Origin: 'https://www.doubao.com',
        Referer: rawUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
      },
      body: JSON.stringify({ share_id: shareId, need_bot_info: true }),
    });
    if (!response.ok) throw new ShareParseError(`Doubao share endpoint returned HTTP ${response.status}.`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new ShareParseError('Doubao share response is too large.');
    const text = await response.text();
    if (text.length > MAX_BYTES) throw new ShareParseError('Doubao share response is too large.');
    return parseDoubaoPayload(JSON.parse(text));
  } catch (error) {
    if (error?.name === 'AbortError') throw new ShareParseError('Doubao share request timed out.', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
