import { ChatMessage, ParsedChat, ParseError, Role } from './types';

// re-export 供上层模块直接使用
export { ParseError };
export type { ChatMessage, ParsedChat, Role };

/**
 * 纯文本对话前缀 → 角色映射。
 * 支持中英文常见称呼。
 */
const PREFIX_ROLES: Array<[RegExp, Role, string]> = [
  [/^\s*(?:用户|我|你|user|me|human)\s*[:：]\s*/i, 'user', '用户'],
  [/^\s*(?:assistant|ai|chatgpt|gpt|claude|bot|助手|机器人|ai助手)\s*[:：]\s*/i, 'assistant', 'AI'],
  [/^\s*(?:system|系统)\s*[:：]\s*/i, 'system', '系统'],
];

/** Markdown 加粗风格: **用户**: / **ChatGPT**: */
const BOLD_PREFIX_ROLES: Array<[RegExp, Role]> = [
  [/^\s*\*\*(?:用户|我|你|user|me|human)\*\*\s*[:：]\s*/i, 'user'],
  [/^\s*\*\*(?:assistant|ai|chatgpt|gpt|claude|bot|助手|机器人|ai助手)\*\*\s*[:：]\s*/i, 'assistant'],
  [/^\s*\*\*(?:system|系统)\*\*\s*[:：]\s*/i, 'system'],
];

/** 检测某行是否为带角色前缀的消息行(纯文本格式) */
export function matchRolePrefix(line: string): { role: Role; rest: string } | null {
  for (const [re, role] of BOLD_PREFIX_ROLES) {
    const m = line.match(re);
    if (m) return { role, rest: line.slice(m[0].length) };
  }
  for (const [re, role] of PREFIX_ROLES) {
    const m = line.match(re);
    if (m) return { role, rest: line.slice(m[0].length) };
  }
  return null;
}

/** 判断文本是否看起来像 JSON */
function looksLikeJson(text: string): boolean {
  const t = text.trim();
  return t.startsWith('{') || t.startsWith('[');
}

/**
 * 解析 ChatGPT 官方导出的 conversation JSON。
 * 兼容:单个 conversation 对象、conversation 数组、
 * 以及 OpenAI 新版导出(顶层含 conversations 字段)。
 */
export function parseChatGptJson(text: string): ParsedChat {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ParseError('JSON 解析失败:内容不是合法的 JSON,请检查是否完整粘贴。');
  }

  // 新版导出: { conversations: [...] }
  if (Array.isArray((data as any)?.conversations)) {
    data = (data as any).conversations;
  }
  if (!Array.isArray(data)) {
    // 单个 conversation 对象
    if (data && typeof data === 'object' && (data as any).mapping) {
      data = [data];
    } else {
      throw new ParseError('无法识别的 JSON 结构:缺少 "mapping" 字段,请粘贴 ChatGPT 官方导出的对话 JSON。');
    }
  }

  const first = (data as any[])[0];
  if (!first || typeof first !== 'object' || !(first as any).mapping) {
    throw new ParseError('无法识别的 JSON 结构:缺少 "mapping" 字段,请粘贴 ChatGPT 官方导出的对话 JSON。');
  }

  const title: string | undefined = (first as any).title || undefined;

  // 按 parent 链从 root 遍历
  const mapping: Record<string, any> = (first as any).mapping;
  let rootId: string | undefined = (first as any).root;
  if (!rootId) {
    rootId = Object.keys(mapping).find((k) => k === 'root' || (mapping[k] && !mapping[k].parent)) || 'root';
  }

  const messages: ChatMessage[] = [];
  const seen = new Set<string>();
  let nodeId: string | undefined = rootId;

  while (nodeId && !seen.has(nodeId)) {
    seen.add(nodeId);
    const node: any = mapping[nodeId];
    if (!node) break;
    const msg = node.message;
    if (msg && msg.author && msg.content) {
      const role = normalizeRole(msg.author.role);
      if (role) {
        const parts = Array.isArray(msg.content.parts) ? msg.content.parts : [];
        const content = parts
          .map((p: unknown) => (typeof p === 'string' ? p : JSON.stringify(p)))
          .join('\n')
          .trim();
        if (content) {
          messages.push({
            role,
            content,
            timestamp: typeof msg.create_time === 'number' ? new Date(msg.create_time * 1000).toISOString() : undefined,
          });
        }
      }
    }
    nodeId = node.children && node.children.length ? node.children[0] : undefined;
  }

  if (messages.length === 0) {
    throw new ParseError('JSON 中没有任何文本消息,请检查导出内容。');
  }
  return { title, messages, source: 'chatgpt-json' };
}

function normalizeRole(role: string): Role | null {
  const r = String(role).toLowerCase();
  if (r === 'user') return 'user';
  if (r === 'assistant') return 'assistant';
  if (r === 'system') return 'system';
  if (r === 'tool') return 'system';
  return null;
}

/**
 * 解析纯文本格式对话:
 *   用户: 你好
 *   ChatGPT: 你好,有什么可以帮你?
 * 支持 **加粗** 前缀、空行分隔消息。
 */
export function parsePlainText(text: string): ParsedChat {
  const lines = text.split(/\r?\n/);
  const messages: ChatMessage[] = [];

  // 去掉首尾空行
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

  if (lines.length === 0) {
    throw new ParseError('对话内容为空,请输入对话或加载示例。');
  }

  let current: { role: Role; parts: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const match = matchRolePrefix(line);
    if (match) {
      if (current) {
        messages.push({ role: current.role, content: current.parts.join('\n').trim() });
      }
      current = { role: match.role, parts: [match.rest.trim()] };
    } else if (line.trim() === '' && current) {
      // 空行:保留为一个换行(段落分隔),不强制结束消息,方便多段内容
      current.parts.push('');
    } else if (current) {
      current.parts.push(line);
    }
    // 没有前缀且没有 current 的行忽略(可能是标题之类)
  }
  if (current) {
    messages.push({ role: current.role, content: current.parts.join('\n').trim() });
  }

  if (messages.length === 0) {
    throw new ParseError(
      '没有识别到对话消息。请使用 "用户:" / "ChatGPT:" 这样的前缀格式,例如:\n\n用户: 你好\nChatGPT: 你好!',
    );
  }
  return { messages, source: 'plaintext' };
}

/** 自动检测格式并解析 */
export function parseChat(text: string): ParsedChat {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ParseError('对话内容为空,请输入对话或加载示例。');
  }
  if (looksLikeJson(trimmed)) {
    return parseChatGptJson(trimmed);
  }
  return parsePlainText(trimmed);
}
