import { forwardRef } from 'react';
import { renderMarkdownToHtml } from '../core/markdown';
import { ChatMessage } from '../core/types';
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
      {/* 头部 */}
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

      {/* 消息列表 */}
      {hasMessages ? (
        messages.map((m, i) => {
          const isUser = m.role === 'user';
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
                  // 供 .c2c-bubble 内部代码块/引用/链接继承主题色
                  ['--c2c-code-bg' as string]: theme.codeBg,
                  ['--c2c-code-text' as string]: theme.codeText,
                  ['--c2c-accent' as string]: theme.accent,
                  ['--c2c-muted' as string]: theme.textSecondary,
                  ['--c2c-link' as string]: theme.link,
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(m.content) }}
              />
            </div>
          );
        })
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0', color: theme.textSecondary, fontSize: 14 }}>
          暂无消息,请在左侧输入对话内容或加载示例
        </div>
      )}

      {/* 页脚 */}
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
