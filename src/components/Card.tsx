import { forwardRef } from 'react';
import { renderMarkdownToHtml } from '../core/markdown';
import { ChatAttachment, ChatMessage } from '../core/types';
import { CardTheme } from '../themes/themes';

interface CardProps {
  messages: ChatMessage[];
  title?: string;
  theme: CardTheme;
}

function avatarText(role: string): string {
  if (role === 'user') return '我';
  if (role === 'system') return 'SYS';
  return 'AI';
}

function safeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatBytes(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentView({ attachment, theme }: { attachment: ChatAttachment; theme: CardTheme }) {
  const url = safeUrl(attachment.url);
  const name = attachment.name || (attachment.type === 'image' ? '图片' : '附件');

  if (attachment.hidden) {
    return (
      <div
        className="c2c-attachment c2c-file"
        style={{
          border: `1px dashed ${theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)'}`,
          borderRadius: 10,
          padding: '9px 11px',
          color: theme.textSecondary,
          fontSize: 12,
        }}
      >
        📎 {name} · 分享平台未公开附件内容
      </div>
    );
  }

  if (attachment.type === 'image' && url) {
    return (
      <figure className="c2c-attachment c2c-image" style={{ margin: 0 }}>
        <img
          src={url}
          alt={name}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          style={{
            display: 'block',
            maxWidth: '100%',
            width: 'auto',
            maxHeight: 420,
            objectFit: 'contain',
            borderRadius: 12,
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'}`,
          }}
        />
        {attachment.name ? (
          <figcaption style={{ marginTop: 6, fontSize: 11, color: theme.textSecondary }}>{attachment.name}</figcaption>
        ) : null}
      </figure>
    );
  }

  const meta = [attachment.mimeType, formatBytes(attachment.size)].filter(Boolean).join(' · ');
  const body = (
    <>
      <span style={{ fontSize: 17, lineHeight: 1 }}>📎</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, overflowWrap: 'anywhere' }}>{name}</span>
        {meta ? <span style={{ display: 'block', marginTop: 2, fontSize: 10, color: theme.textSecondary }}>{meta}</span> : null}
      </span>
    </>
  );

  const style = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.09)'}`,
    borderRadius: 10,
    padding: '9px 11px',
    color: 'inherit',
    textDecoration: 'none',
  } as const;

  return url ? (
    <a className="c2c-attachment c2c-file" href={url} target="_blank" rel="noopener noreferrer" style={style}>
      {body}
    </a>
  ) : (
    <div className="c2c-attachment c2c-file" style={style}>
      {body}
    </div>
  );
}

/**
 * 对话卡片。
 * 宽度固定 760px,颜色全部内联 —— 便于 html2canvas 截图与 HTML 导出保持一致。
 */
const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ messages, title, theme }, ref) {
  const hasMessages = messages.length > 0;
  return (
    <div
      ref={ref}
      className="c2c-card"
      style={{
        width: 760,
        background: theme.background,
        color: theme.textPrimary,
        borderRadius: 24,
        padding: '44px 44px 36px',
        boxShadow: theme.isDark ? '0 24px 64px rgba(0,0,0,0.45)' : '0 16px 48px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: theme.accent,
            border: `1px solid ${theme.accent}`,
            borderRadius: 999,
            padding: '4px 14px',
            marginBottom: 14,
          }}
        >
          AI Conversation
        </div>
        {title ? (
          <div style={{ fontSize: 26, fontWeight: 700, color: theme.headerTitle, lineHeight: 1.4 }}>{title}</div>
        ) : null}
        <div style={{ fontSize: 13, color: theme.footerText, marginTop: 8 }}>
          {hasMessages ? `${messages.length} 条消息` : ''} · 由 chat2card 生成
        </div>
      </div>

      {hasMessages ? (
        messages.map((m, i) => {
          const isUser = m.role === 'user';
          const attachments = m.attachments ?? [];
          return (
            <div
              key={i}
              className="c2c-msg"
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}
            >
              <div
                className="c2c-avatar"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                  background: isUser ? theme.bubbleUserBg : theme.bubbleAssistantBg,
                  color: isUser ? theme.bubbleUserText : theme.textPrimary,
                  border: isUser ? 'none' : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                {avatarText(m.role)}
              </div>
              <div
                className="c2c-bubble"
                style={{
                  maxWidth: '82%',
                  padding: '14px 18px',
                  borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                  fontSize: 15,
                  lineHeight: 1.75,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  background: isUser ? theme.bubbleUserBg : theme.bubbleAssistantBg,
                  color: isUser ? theme.bubbleUserText : theme.bubbleAssistantText,
                  ['--c2c-code-bg' as string]: theme.codeBg,
                  ['--c2c-code-text' as string]: theme.codeText,
                  ['--c2c-accent' as string]: theme.accent,
                  ['--c2c-muted' as string]: theme.textSecondary,
                  ['--c2c-link' as string]: theme.link,
                }}
              >
                {m.content ? <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(m.content) }} /> : null}
                {attachments.length > 0 ? (
                  <div className="c2c-attachments" style={{ display: 'grid', gap: 8, marginTop: m.content ? 12 : 0 }}>
                    {attachments.map((attachment, index) => (
                      <AttachmentView key={`${attachment.url ?? attachment.name ?? 'attachment'}-${index}`} attachment={attachment} theme={theme} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0', color: theme.textSecondary, fontSize: 14 }}>
          暂无消息,请在左侧输入对话内容或加载示例
        </div>
      )}

      <div
        style={{
          textAlign: 'center',
          marginTop: 34,
          fontSize: 12,
          color: theme.footerText,
          letterSpacing: 0.5,
        }}
      >
        Made with <span style={{ color: theme.accent }}>chat2card</span> · github.com/cshouuu/chat2card
      </div>
    </div>
  );
});

export default Card;
