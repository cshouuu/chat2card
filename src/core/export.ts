import { CardTheme } from '../themes/themes';
import { renderMarkdownToHtml } from './markdown';
import { ChatAttachment, ChatMessage } from './types';

const ROLE_LABEL: Record<string, string> = {
  user: '用户',
  assistant: 'AI',
  system: '系统',
};

function safeHttpsUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function attachmentMarkdown(attachment: ChatAttachment): string {
  const name = attachment.name || (attachment.type === 'image' ? '图片' : '附件');
  if (attachment.hidden) return `> 📎 ${name}（分享平台未公开附件内容）`;
  const url = safeHttpsUrl(attachment.url);
  if (attachment.type === 'image' && url) return `![${name.replace(/[\[\]]/g, '')}](${url})`;
  if (url) return `[📎 ${name.replace(/[\[\]]/g, '')}](${url})`;
  return `📎 ${name}`;
}

/** 导出为 Markdown 文档 */
export function exportMarkdown(messages: ChatMessage[], title?: string): string {
  const lines: string[] = [];
  if (title) lines.push(`# ${title}`, '');
  for (const m of messages) {
    lines.push(`## ${ROLE_LABEL[m.role] ?? m.role}`, '');
    if (m.content) lines.push(m.content, '');
    for (const attachment of m.attachments ?? []) {
      lines.push(attachmentMarkdown(attachment), '');
    }
  }
  return lines.join('\n').trim() + '\n';
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentHtml(attachment: ChatAttachment): string {
  const name = escapeHtmlAttr(attachment.name || (attachment.type === 'image' ? '图片' : '附件'));
  if (attachment.hidden) {
    return `<div class="attachment file hidden">📎 ${name} · 分享平台未公开附件内容</div>`;
  }

  const url = safeHttpsUrl(attachment.url);
  if (attachment.type === 'image' && url) {
    const src = escapeHtmlAttr(url);
    return `<figure class="attachment image"><img src="${src}" alt="${name}" crossorigin="anonymous" referrerpolicy="no-referrer" />${attachment.name ? `<figcaption>${name}</figcaption>` : ''}</figure>`;
  }

  const meta = [attachment.mimeType, formatBytes(attachment.size)].filter(Boolean).map((x) => escapeHtmlAttr(x as string)).join(' · ');
  const inner = `<span class="file-icon">📎</span><span><strong>${name}</strong>${meta ? `<small>${meta}</small>` : ''}</span>`;
  return url
    ? `<a class="attachment file" href="${escapeHtmlAttr(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<div class="attachment file">${inner}</div>`;
}

/** 生成与预览一致的卡片 HTML(CSS 内联自包含) */
export function exportHtml(messages: ChatMessage[], title: string | undefined, theme: CardTheme): string {
  const avatar = (role: string) => (role === 'user' ? '我' : role === 'system' ? 'SYS' : 'AI');
  const body = messages
    .map((m) => {
      const isUser = m.role === 'user';
      const avatarText = avatar(m.role);
      const avatarBg = isUser ? theme.bubbleUserBg : theme.bubbleAssistantBg;
      const avatarColor = isUser ? theme.bubbleUserText : theme.textPrimary;
      const bubbleBg = isUser ? theme.bubbleUserBg : theme.bubbleAssistantBg;
      const bubbleColor = isUser ? theme.bubbleUserText : theme.bubbleAssistantText;
      const html = m.content ? renderMarkdownToHtml(m.content) : '';
      const attachments = (m.attachments ?? []).map(attachmentHtml).join('');
      return `
      <div class="msg ${isUser ? 'user' : 'ai'}">
        <div class="avatar" style="background:${avatarBg};color:${avatarColor}">${escapeHtmlAttr(avatarText)}</div>
        <div class="bubble" style="background:${bubbleBg};color:${bubbleColor}">${html}${attachments ? `<div class="attachments">${attachments}</div>` : ''}</div>
      </div>`;
    })
    .join('\n');

  const titleHtml = title ? `<div class="title">${escapeHtmlAttr(title)}</div>` : '';

  return `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="generator" content="chat2card" />
<title>${escapeHtmlAttr(title ?? 'AI 对话')} · chat2card</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: ${theme.background};
    color: ${theme.textPrimary};
    min-height: 100vh;
    padding: 48px 32px;
    display: flex;
    justify-content: center;
  }
  .card { width: 100%; max-width: 760px; }
  .header { text-align: center; margin-bottom: 32px; }
  .brand { display:inline-block;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${theme.accent};border:1px solid ${theme.accent};border-radius:999px;padding:4px 14px;margin-bottom:16px; }
  .title { font-size: 26px; font-weight: 700; color: ${theme.headerTitle}; }
  .meta { font-size: 13px; color: ${theme.footerText}; margin-top: 8px; }
  .msg { display: flex; gap: 12px; margin-bottom: 20px; }
  .msg.user { flex-direction: row-reverse; }
  .avatar { width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0; }
  .bubble { max-width:82%;padding:14px 18px;border-radius:18px;font-size:15px;line-height:1.75;word-break:break-word;overflow-wrap:break-word; }
  .bubble p { margin: 0 0 10px; }
  .bubble p:last-child { margin-bottom: 0; }
  .bubble pre { background:${theme.codeBg};color:${theme.codeText};padding:12px 14px;border-radius:10px;overflow-x:auto;font-size:13px;line-height:1.6;margin:10px 0;font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace; }
  .bubble code { font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;background:${theme.codeBg};color:${theme.codeText};padding:2px 6px;border-radius:5px; }
  .bubble pre code { padding: 0; background: none; }
  .bubble ul, .bubble ol { padding-left: 22px; margin: 8px 0; }
  .bubble blockquote { border-left:3px solid ${theme.accent};color:${theme.textSecondary};padding-left:12px;margin:8px 0; }
  .bubble a { color: ${theme.link}; }
  .bubble h1, .bubble h2, .bubble h3, .bubble h4 { margin: 12px 0 8px; }
  .attachments { display:grid;gap:8px;margin-top:12px; }
  .attachment.image { margin:0; }
  .attachment.image img { display:block;max-width:100%;width:auto;max-height:420px;object-fit:contain;border-radius:12px;border:1px solid rgba(127,127,127,.18); }
  .attachment.image figcaption { margin-top:6px;font-size:11px;color:${theme.textSecondary}; }
  .attachment.file { display:flex;gap:8px;align-items:center;border:1px solid rgba(127,127,127,.2);border-radius:10px;padding:9px 11px;color:inherit;text-decoration:none; }
  .attachment.file.hidden { border-style:dashed;color:${theme.textSecondary};font-size:12px; }
  .attachment.file strong { display:block;font-size:12px;overflow-wrap:anywhere; }
  .attachment.file small { display:block;margin-top:2px;font-size:10px;color:${theme.textSecondary}; }
  .file-icon { font-size:17px; }
  .footer { text-align:center;margin-top:40px;font-size:12px;color:${theme.footerText}; }
  .footer span { color: ${theme.accent}; }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">AI Conversation</div>
      ${titleHtml}
      <div class="meta">${messages.length} 条消息 · 由 chat2card 生成</div>
    </div>
    ${body}
    <div class="footer">Made with <span>chat2card</span> · github.com/cshouuu/chat2card</div>
  </div>
</body>
</html>`;
}
