/** 消息角色 */
export type Role = 'user' | 'assistant' | 'system';

/** 分享对话中的图片/文件附件 */
export interface ChatAttachment {
  type: 'image' | 'file';
  /** 平台可见的文件名；某些分享页会隐藏真实文件名 */
  name?: string;
  /** 公开可访问的预览/下载 URL；不可公开访问时为空 */
  url?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  /** 平台明确隐藏附件内容时为 true */
  hidden?: boolean;
}

/** 一条对话消息 */
export interface ChatMessage {
  role: Role;
  content: string;
  attachments?: ChatAttachment[];
  /** ISO 时间字符串,可选 */
  timestamp?: string;
}

/** 解析结果 */
export interface ParsedChat {
  title?: string;
  messages: ChatMessage[];
  /** 解析来源 */
  source: 'plaintext' | 'chatgpt-json' | 'manual' | 'link';
}

/** 解析失败时抛出的错误 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
