import { forwardRef, ReactNode } from 'react';
import { renderMarkdownToHtml } from '../core/markdown';
import { ChatAttachment, ChatMessage } from '../core/types';
import { CardTheme } from '../themes/themes';

interface CardProps {
  messages: ChatMessage[];
  title?: string;
  theme: CardTheme;
  assistantLabel?: string;
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

function formatTime(timestamp?: string): string | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return timestamp.length <= 12 ? timestamp : null;
}

function AttachmentView({ attachment, theme }: { attachment: ChatAttachment; theme: CardTheme }) {
  const url = safeUrl(attachment.url);
  const name = attachment.name || (attachment.type === 'image' ? '图片' : '附件');

  if (attachment.hidden) {
    return (
      <div
        className="c2c-attachment c2c-file"
        style={{
          border: `1px dashed ${theme.isDark ? 'rgba(255,255,255,.24)' : 'rgba(0,0,0,.16)'}`,
          borderRadius: 14,
          padding: '11px 13px',
          color: theme.textSecondary,
          fontSize: 12,
          background: theme.isDark ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.42)',
        }}
      >
        <span style={{ marginRight: 7 }}>📎</span>
        {name} · 分享平台未公开附件内容
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
            width: '100%',
            maxHeight: 440,
            objectFit: 'cover',
            borderRadius: 16,
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.08)'}`,
          }}
        />
        {attachment.name ? (
          <figcaption style={{ marginTop: 7, fontSize: 11, color: theme.textSecondary }}>{attachment.name}</figcaption>
        ) : null}
      </figure>
    );
  }

  const meta = [attachment.mimeType, formatBytes(attachment.size)].filter(Boolean).join(' · ');
  const body = (
    <>
      <span
        style={{
          width: 34,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 10,
          background: theme.accentSoft,
          color: theme.accent,
          flexShrink: 0,
        }}
      >
        ↗
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflowWrap: 'anywhere' }}>{name}</span>
        {meta ? <span style={{ display: 'block', marginTop: 3, fontSize: 10, color: theme.textSecondary }}>{meta}</span> : null}
      </span>
    </>
  );

  const style = {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.09)'}`,
    borderRadius: 14,
    padding: '10px 12px',
    color: 'inherit',
    textDecoration: 'none',
    background: theme.isDark ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.45)',
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

function Circle({
  size,
  top,
  left,
  right,
  bottom,
  background,
  blur = 0,
  opacity = 1,
}: {
  size: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  background: string;
  blur?: number;
  opacity?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        top,
        left,
        right,
        bottom,
        background,
        filter: blur ? `blur(${blur}px)` : undefined,
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
}

function ThemeDecorations({ theme }: { theme: CardTheme }): ReactNode {
  switch (theme.motif) {
    case 'glass':
      return (
        <>
          <Circle size={260} top={-110} right={-70} background="rgba(34,211,238,.26)" blur={32} />
          <Circle size={300} bottom={-160} left={-120} background="rgba(168,85,247,.30)" blur={38} />
          <span aria-hidden style={{ position: 'absolute', right: 58, top: 98, color: 'rgba(255,255,255,.22)', fontSize: 64 }}>✦</span>
          <span aria-hidden style={{ position: 'absolute', right: 120, top: 48, color: 'rgba(103,232,249,.3)', fontSize: 18 }}>✧</span>
        </>
      );
    case 'editorial':
      return (
        <>
          <div aria-hidden style={{ position: 'absolute', right: 22, top: 150, writingMode: 'vertical-rl', fontFamily: theme.titleFont, fontSize: 72, lineHeight: 1, color: 'rgba(183,134,61,.09)', letterSpacing: 1 }}>chat2card</div>
          <div aria-hidden style={{ position: 'absolute', right: 28, bottom: 32, width: 72, height: 72, border: '1px solid rgba(183,134,61,.28)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'rgba(183,134,61,.55)', fontFamily: theme.titleFont, fontSize: 30 }}>C</div>
        </>
      );
    case 'paper':
      return (
        <>
          <div aria-hidden style={{ position: 'absolute', right: 34, top: 38, width: 116, height: 116, border: '2px solid rgba(239,112,76,.22)', borderRadius: '50%', color: 'rgba(239,112,76,.35)', display: 'grid', placeItems: 'center', transform: 'rotate(12deg)', fontSize: 12, letterSpacing: 2, textAlign: 'center' }}>SUNSET<br />PAPER</div>
          <div aria-hidden style={{ position: 'absolute', left: 42, bottom: 90, width: 76, height: 3, borderRadius: 99, background: 'rgba(239,112,76,.28)', transform: 'rotate(-8deg)' }} />
        </>
      );
    case 'terminal':
      return (
        <>
          <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: .14, backgroundImage: 'linear-gradient(rgba(74,222,128,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.18) 1px,transparent 1px)', backgroundSize: '34px 34px' }} />
          <div aria-hidden style={{ position: 'absolute', top: 24, right: 30, color: 'rgba(74,222,128,.4)', fontFamily: theme.bodyFont, fontSize: 11, lineHeight: 1.8, textAlign: 'right' }}>// GENERATE<br />// REFINE<br />// SHARE</div>
        </>
      );
    case 'sticker':
      return (
        <>
          <span aria-hidden style={{ position: 'absolute', left: -15, top: 120, width: 76, height: 76, display: 'grid', placeItems: 'center', background: '#f472b6', color: '#fff', border: '7px solid white', borderRadius: 24, transform: 'rotate(-12deg)', boxShadow: '0 10px 24px rgba(0,0,0,.12)', fontSize: 32 }}>★</span>
          <span aria-hidden style={{ position: 'absolute', right: -12, top: 250, width: 88, height: 88, display: 'grid', placeItems: 'center', background: '#60a5fa', color: '#fff', border: '7px solid white', borderRadius: '50%', transform: 'rotate(9deg)', boxShadow: '0 10px 24px rgba(0,0,0,.1)', fontSize: 28 }}>☺</span>
          <span aria-hidden style={{ position: 'absolute', right: 72, bottom: 70, color: '#a855f7', fontSize: 30, transform: 'rotate(12deg)' }}>♡</span>
        </>
      );
    case 'zen':
      return (
        <>
          <div aria-hidden style={{ position: 'absolute', left: -36, top: 0, bottom: 0, width: 76, background: 'linear-gradient(90deg,rgba(38,37,33,.28),transparent)', opacity: .65 }} />
          <Circle size={150} right={-42} bottom={48} background="radial-gradient(circle at 35% 30%,#6f6a62,#2f2e2b 72%)" opacity={.34} />
          <div aria-hidden style={{ position: 'absolute', right: 10, bottom: 104, width: 220, height: 90, borderBottom: '1px solid rgba(78,75,69,.18)', borderRadius: '50%', transform: 'rotate(-4deg)' }} />
        </>
      );
    case 'space':
      return (
        <>
          <Circle size={180} top={-90} right={-20} background="rgba(148,163,184,.12)" blur={18} />
          <span aria-hidden style={{ position: 'absolute', top: 52, right: 70, color: 'rgba(255,255,255,.25)', fontSize: 14 }}>✦</span>
          <span aria-hidden style={{ position: 'absolute', top: 112, right: 150, color: 'rgba(255,255,255,.16)', fontSize: 9 }}>✦</span>
          <span aria-hidden style={{ position: 'absolute', top: 180, right: 48, color: 'rgba(255,255,255,.12)', fontSize: 6 }}>●</span>
        </>
      );
    case 'forest':
      return (
        <>
          <Circle size={180} top={-92} right={-54} background="rgba(89,125,93,.13)" />
          <span aria-hidden style={{ position: 'absolute', right: 28, top: 65, color: 'rgba(66,109,72,.22)', fontSize: 88, transform: 'rotate(-24deg)' }}>❧</span>
        </>
      );
    case 'candy':
      return (
        <>
          <Circle size={160} top={-68} right={-48} background="rgba(244,114,182,.16)" />
          <Circle size={120} top={72} right={40} background="rgba(96,165,250,.10)" />
          <Circle size={130} bottom={-58} left={-30} background="rgba(167,139,250,.13)" />
        </>
      );
    case 'grid':
      return (
        <>
          <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: .12, backgroundImage: 'linear-gradient(rgba(125,211,252,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(125,211,252,.35) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
          <div aria-hidden style={{ position: 'absolute', top: 24, right: 28, color: 'rgba(165,243,252,.38)', fontFamily: theme.titleFont, fontSize: 10, letterSpacing: 1.5 }}>X:0760 / GRID:28</div>
        </>
      );
    default:
      return <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: theme.accent }} />;
  }
}

/**
 * 社媒分享卡片。固定 760px 宽，整体使用内联样式，保证 html2canvas 导出稳定。
 */
const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ messages, title, theme, assistantLabel = 'AI' }, ref) {
  const hasMessages = messages.length > 0;
  const displayTitle = title || '一段值得分享的 AI 对话';
  const titleSize = displayTitle.length > 34 ? 31 : displayTitle.length > 22 ? 35 : 40;
  const isCenter = theme.headerAlign === 'center';

  return (
    <div
      ref={ref}
      className={`c2c-card c2c-theme-${theme.motif}`}
      style={{
        width: 760,
        position: 'relative',
        overflow: 'hidden',
        background: theme.background,
        color: theme.textPrimary,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: theme.cardRadius,
        padding: '46px 46px 34px',
        boxShadow: theme.cardShadow,
        fontFamily: theme.bodyFont,
      }}
    >
      <ThemeDecorations theme={theme} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{ textAlign: isCenter ? 'center' : 'left', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2.3,
              textTransform: 'uppercase',
              color: theme.accent,
              border: `1px solid ${theme.cardBorder}`,
              background: theme.accentSoft,
              borderRadius: 999,
              padding: '7px 12px',
              marginBottom: 18,
              backdropFilter: theme.motif === 'glass' ? 'blur(14px)' : undefined,
            }}
          >
            <span style={{ fontSize: 11 }}>✦</span>
            AI Conversation
          </div>

          <h1
            style={{
              margin: 0,
              maxWidth: isCenter ? 620 : 590,
              marginInline: isCenter ? 'auto' : undefined,
              color: theme.headerTitle,
              fontFamily: theme.titleFont,
              fontSize: titleSize,
              fontWeight: theme.titleWeight,
              lineHeight: 1.24,
              letterSpacing: theme.motif === 'terminal' || theme.motif === 'grid' ? -1.2 : -0.8,
              textWrap: 'balance',
            }}
          >
            {displayTitle}
          </h1>

          <div
            style={{
              display: 'flex',
              justifyContent: isCenter ? 'center' : 'flex-start',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 14,
              color: theme.textSecondary,
              fontSize: 11,
              letterSpacing: .2,
            }}
          >
            <span>{hasMessages ? `${messages.length} 条消息` : '等待对话'}</span>
            <span style={{ opacity: .5 }}>·</span>
            <span>{theme.shortName}</span>
            <span style={{ opacity: .5 }}>·</span>
            <span>由 chat2card 生成</span>
          </div>
        </header>

        {hasMessages ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              const isSystem = m.role === 'system';
              const attachments = m.attachments ?? [];
              const bubbleBg = isUser ? theme.bubbleUserBg : theme.bubbleAssistantBg;
              const bubbleText = isUser ? theme.bubbleUserText : theme.bubbleAssistantText;
              const bubbleBorder = isUser ? theme.bubbleUserBorder : theme.bubbleAssistantBorder;
              const roleLabel = isUser ? '用户' : isSystem ? '系统' : assistantLabel;
              const timestamp = formatTime(m.timestamp);

              return (
                <article
                  key={i}
                  className={`c2c-msg ${isUser ? 'c2c-user' : 'c2c-assistant'}`}
                  style={{
                    position: 'relative',
                    border: `1px solid ${bubbleBorder}`,
                    borderRadius: theme.motif === 'terminal' || theme.motif === 'grid' ? 16 : theme.motif === 'sticker' ? 22 : 20,
                    padding: '17px 18px 18px',
                    background: bubbleBg,
                    color: bubbleText,
                    boxShadow: theme.bubbleShadow,
                    backdropFilter: theme.motif === 'glass' ? 'blur(18px)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: m.content || attachments.length ? 10 : 0 }}>
                    <div
                      className="c2c-avatar"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: theme.motif === 'terminal' || theme.motif === 'grid' ? 10 : '50%',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        color: isUser ? bubbleText : theme.accent,
                        background: isUser ? (theme.isDark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.64)') : theme.accentSoft,
                        border: `1px solid ${bubbleBorder}`,
                        fontSize: isUser ? 14 : 10,
                        fontWeight: 800,
                        letterSpacing: isUser ? 0 : .6,
                      }}
                    >
                      {isUser ? '我' : isSystem ? 'SYS' : 'AI'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: isUser ? bubbleText : theme.accent }}>{roleLabel}</div>
                      <div style={{ marginTop: 1, fontSize: 9, letterSpacing: 1.3, opacity: .54 }}>{isUser ? 'PROMPT' : isSystem ? 'SYSTEM' : 'RESPONSE'}</div>
                    </div>
                    {timestamp ? <time style={{ fontSize: 10, opacity: .58 }}>{timestamp}</time> : null}
                  </div>

                  <div
                    className="c2c-bubble"
                    style={{
                      fontSize: 15,
                      lineHeight: 1.78,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      color: bubbleText,
                      ['--c2c-code-bg' as string]: theme.codeBg,
                      ['--c2c-code-text' as string]: theme.codeText,
                      ['--c2c-accent' as string]: theme.accent,
                      ['--c2c-muted' as string]: theme.textSecondary,
                      ['--c2c-link' as string]: theme.link,
                    }}
                  >
                    {m.content ? <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(m.content) }} /> : null}
                    {attachments.length > 0 ? (
                      <div className="c2c-attachments" style={{ display: 'grid', gap: 9, marginTop: m.content ? 13 : 0 }}>
                        {attachments.map((attachment, index) => (
                          <AttachmentView key={`${attachment.url ?? attachment.name ?? 'attachment'}-${index}`} attachment={attachment} theme={theme} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '58px 24px',
              color: theme.textSecondary,
              fontSize: 13,
              border: `1px dashed ${theme.cardBorder}`,
              borderRadius: 20,
              background: theme.surface,
            }}
          >
            暂无消息 · 在左侧粘贴分享链接或对话内容
          </div>
        )}

        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 18,
            marginTop: 30,
            paddingTop: 18,
            borderTop: `1px solid ${theme.cardBorder}`,
            color: theme.footerText,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.textPrimary, fontSize: 14, fontWeight: 800 }}>
              <span style={{ width: 25, height: 25, display: 'grid', placeItems: 'center', borderRadius: 8, background: theme.accent, color: theme.isDark ? '#081018' : '#fff', fontSize: 10 }}>C2</span>
              chat2card
            </div>
            <div style={{ marginTop: 6, fontSize: 10.5 }}>让有价值的 AI 对话，更值得被分享</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 10.5, lineHeight: 1.6 }}>
            <div style={{ color: theme.accent, fontWeight: 700 }}>{theme.shortName}</div>
            <div>AI · DIALOGUE · SHARE</div>
          </div>
        </footer>
      </div>
    </div>
  );
});

export default Card;
