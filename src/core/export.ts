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
  for (const message of messages) {
    lines.push(`## ${ROLE_LABEL[message.role] ?? message.role}`, '');
    if (message.content) lines.push(message.content, '');
    for (const attachment of message.attachments ?? []) lines.push(attachmentMarkdown(attachment), '');
  }
  return lines.join('\n').trim() + '\n';
}

function escapeHtmlAttr(value: string): string {
  return value
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
  if (attachment.hidden) return `<div class="attachment file hidden">📎 ${name} · 分享平台未公开附件内容</div>`;

  const url = safeHttpsUrl(attachment.url);
  if (attachment.type === 'image' && url) {
    const src = escapeHtmlAttr(url);
    return `<figure class="attachment image"><img src="${src}" alt="${name}" crossorigin="anonymous" referrerpolicy="no-referrer" />${attachment.name ? `<figcaption>${name}</figcaption>` : ''}</figure>`;
  }

  const meta = [attachment.mimeType, formatBytes(attachment.size)]
    .filter(Boolean)
    .map((item) => escapeHtmlAttr(item as string))
    .join(' · ');
  const inner = `<span class="file-icon">↗</span><span><strong>${name}</strong>${meta ? `<small>${meta}</small>` : ''}</span>`;
  return url
    ? `<a class="attachment file" href="${escapeHtmlAttr(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<div class="attachment file">${inner}</div>`;
}

function messageTime(timestamp?: string): string {
  if (!timestamp) return '';
  const parsed = new Date(timestamp);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return timestamp.length <= 12 ? timestamp : '';
}

/** 生成与新版卡片尽量一致的自包含 HTML。 */
export function exportHtml(
  messages: ChatMessage[],
  title: string | undefined,
  theme: CardTheme,
  assistantLabel = 'AI',
): string {
  const body = messages
    .map((message) => {
      const isUser = message.role === 'user';
      const isSystem = message.role === 'system';
      const role = isUser ? '用户' : isSystem ? '系统' : assistantLabel;
      const tag = isUser ? 'PROMPT' : isSystem ? 'SYSTEM' : 'RESPONSE';
      const bubbleBg = isUser ? theme.bubbleUserBg : theme.bubbleAssistantBg;
      const bubbleColor = isUser ? theme.bubbleUserText : theme.bubbleAssistantText;
      const bubbleBorder = isUser ? theme.bubbleUserBorder : theme.bubbleAssistantBorder;
      const html = message.content ? renderMarkdownToHtml(message.content) : '';
      const attachments = (message.attachments ?? []).map(attachmentHtml).join('');
      const time = messageTime(message.timestamp);
      return `
      <article class="msg" style="background:${bubbleBg};color:${bubbleColor};border-color:${bubbleBorder}">
        <div class="msg-head">
          <div class="avatar" style="color:${isUser ? bubbleColor : theme.accent};background:${isUser ? (theme.isDark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.64)') : theme.accentSoft};border-color:${bubbleBorder}">${isUser ? '我' : isSystem ? 'SYS' : 'AI'}</div>
          <div class="role"><strong style="color:${isUser ? bubbleColor : theme.accent}">${escapeHtmlAttr(role)}</strong><small>${tag}</small></div>
          ${time ? `<time>${escapeHtmlAttr(time)}</time>` : ''}
        </div>
        <div class="bubble">${html}${attachments ? `<div class="attachments">${attachments}</div>` : ''}</div>
      </article>`;
    })
    .join('\n');

  const displayTitle = title || '一段值得分享的 AI 对话';

  return `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="generator" content="chat2card" />
<title>${escapeHtmlAttr(displayTitle)} · chat2card</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    padding: 42px 24px;
    background: #080b13;
    color: ${theme.textPrimary};
    font-family: ${theme.bodyFont};
  }
  .card {
    position: relative;
    overflow: hidden;
    width: min(760px, 100%);
    margin: 0 auto;
    padding: 46px 46px 34px;
    border: 1px solid ${theme.cardBorder};
    border-radius: ${theme.cardRadius}px;
    background: ${theme.background};
    box-shadow: ${theme.cardShadow};
  }
  .card::before {
    content: "";
    position: absolute;
    width: 280px;
    height: 280px;
    right: -130px;
    top: -130px;
    border-radius: 50%;
    background: ${theme.accentSoft};
    filter: blur(36px);
    pointer-events: none;
  }
  .inner { position: relative; z-index: 1; }
  .header { text-align: ${theme.headerAlign}; margin-bottom: 32px; }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    padding: 7px 12px;
    border: 1px solid ${theme.cardBorder};
    border-radius: 999px;
    background: ${theme.accentSoft};
    color: ${theme.accent};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2.3px;
    text-transform: uppercase;
  }
  h1 {
    max-width: 610px;
    margin: ${theme.headerAlign === 'center' ? '0 auto' : '0'};
    color: ${theme.headerTitle};
    font-family: ${theme.titleFont};
    font-size: 38px;
    font-weight: ${theme.titleWeight};
    line-height: 1.24;
    letter-spacing: -.8px;
  }
  .meta { margin-top: 14px; color: ${theme.textSecondary}; font-size: 11px; }
  .messages { display: grid; gap: 14px; }
  .msg {
    padding: 17px 18px 18px;
    border: 1px solid;
    border-radius: 20px;
    box-shadow: ${theme.bubbleShadow};
  }
  .msg-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .avatar {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    border: 1px solid;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 800;
  }
  .role { flex: 1; min-width: 0; }
  .role strong { display: block; font-size: 12px; font-weight: 800; }
  .role small { display: block; margin-top: 1px; opacity: .54; font-size: 9px; letter-spacing: 1.3px; }
  time { opacity: .58; font-size: 10px; }
  .bubble { font-size: 15px; line-height: 1.78; word-break: break-word; overflow-wrap: break-word; }
  .bubble p { margin: 0 0 10px; }
  .bubble p:last-child { margin-bottom: 0; }
  .bubble pre { background:${theme.codeBg};color:${theme.codeText};padding:12px 14px;border-radius:10px;overflow-x:auto;font-size:12.5px;line-height:1.62;margin:11px 0;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap; }
  .bubble code { font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;background:${theme.codeBg};color:${theme.codeText};padding:2px 5px;border-radius:5px; }
  .bubble pre code { padding: 0; background: none; }
  .bubble ul, .bubble ol { padding-left: 22px; margin: 8px 0; }
  .bubble blockquote { border-left:3px solid ${theme.accent};color:${theme.textSecondary};padding-left:12px;margin:9px 0; }
  .bubble a { color: ${theme.link}; }
  .attachments { display:grid; gap:9px; margin-top:13px; }
  .attachment.image { margin:0; }
  .attachment.image img { display:block;width:100%;max-height:440px;object-fit:cover;border-radius:16px;border:1px solid rgba(127,127,127,.18); }
  .attachment.image figcaption { margin-top:7px;font-size:11px;color:${theme.textSecondary}; }
  .attachment.file { display:flex;gap:10px;align-items:center;border:1px solid rgba(127,127,127,.2);border-radius:14px;padding:10px 12px;color:inherit;text-decoration:none;background:rgba(255,255,255,.035); }
  .attachment.file.hidden { border-style:dashed;color:${theme.textSecondary};font-size:12px; }
  .attachment.file strong { display:block;font-size:12px;overflow-wrap:anywhere; }
  .attachment.file small { display:block;margin-top:3px;font-size:10px;color:${theme.textSecondary}; }
  .file-icon { display:grid;place-items:center;width:34px;height:34px;flex:0 0 auto;border-radius:10px;background:${theme.accentSoft};color:${theme.accent}; }
  .footer { display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-top:30px;padding-top:18px;border-top:1px solid ${theme.cardBorder};color:${theme.footerText};font-size:10.5px; }
  .brand { color:${theme.textPrimary};font-size:14px;font-weight:800; }
  .brand span { display:inline-grid;place-items:center;width:25px;height:25px;margin-right:8px;border-radius:8px;background:${theme.accent};color:${theme.isDark ? '#081018' : '#fff'};font-size:10px; }
  .theme-name { color:${theme.accent};font-weight:700;text-align:right; }
</style>
</head>
<body>
  <main class="card">
    <div class="inner">
      <header class="header">
        <div class="badge">✦ AI Conversation</div>
        <h1>${escapeHtmlAttr(displayTitle)}</h1>
        <div class="meta">${messages.length} 条消息 · ${escapeHtmlAttr(theme.shortName)} · 由 chat2card 生成</div>
      </header>
      <section class="messages">${body}</section>
      <footer class="footer">
        <div><div class="brand"><span>C2</span>chat2card</div><div style="margin-top:6px">让有价值的 AI 对话，更值得被分享</div></div>
        <div><div class="theme-name">${escapeHtmlAttr(theme.shortName)}</div><div style="margin-top:3px">AI · DIALOGUE · SHARE</div></div>
      </footer>
    </div>
  </main>
</body>
</html>`;
}
