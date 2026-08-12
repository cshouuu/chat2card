/** 消息角色 */
export type Role = 'user' | 'assistant' | 'system';

/** 一条对话消息 */
export interface ChatMessage {
  role: Role;
  content: string;
  /** ISO 时间字符串,可选 */
  timestamp?: string;
}

/** 解析结果 */
export interface ParsedChat {
  title?: string;
  messages: ChatMessage[];
  /** 解析来源 */
  source: 'plaintext' | 'chatgpt-json' | 'manual';
}

/** 解析失败时抛出的错误 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
