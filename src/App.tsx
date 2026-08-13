import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import Card from './components/Card';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Toolbar from './components/Toolbar';
import { exportHtml, exportMarkdown } from './core/export';
import { detectPlatform, isShareLink, parseShareLink, PLATFORM_INFO } from './core/linkParser';
import { ParseError, parseChat } from './core/parser';
import { DEFAULT_SAMPLE, TECH_SAMPLE } from './samples';
import { getTheme } from './themes/themes';

type ExportFormat = 'png' | 'html' | 'md';

function downloadBlob(content: string | Blob, filename: string, mime: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sampleToText(sample: { title: string; messages: { role: string; content: string }[] }): string {
  return sample.messages
    .map((message) => {
      const label = message.role === 'user' ? '用户' : message.role === 'system' ? '系统' : 'ChatGPT';
      return `${label}: ${message.content}`;
    })
    .join('\n\n');
}

export default function App() {
  const [rawText, setRawText] = useState(() => sampleToText(DEFAULT_SAMPLE));
  const [title, setTitle] = useState(DEFAULT_SAMPLE.title);
  const [themeId, setThemeId] = useState('paper');
  const [exporting, setExporting] = useState(false);
  const [linkParsing, setLinkParsing] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<Awaited<ReturnType<typeof parseShareLink>> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isLink = isShareLink(rawText);
  const platform = isLink ? detectPlatform(rawText.trim()) : null;

  const { parsed, error } = useMemo(() => {
    if (isLink) return { parsed: null, error: null };
    try {
      return { parsed: parseChat(rawText), error: null };
    } catch (parseError) {
      return { parsed: null, error: parseError instanceof ParseError ? parseError.message : String(parseError) };
    }
  }, [rawText, isLink]);

  useEffect(() => {
    if (!isLink) {
      setLinkParsing(false);
      setLinkError(null);
      setLinkResult(null);
      return;
    }

    let cancelled = false;
    setLinkParsing(true);
    setLinkError(null);
    const timer = setTimeout(async () => {
      try {
        const result = await parseShareLink(rawText.trim());
        if (cancelled) return;
        setLinkResult(result);
        setLinkParsing(false);
        setTitle(result.title ?? '');
      } catch (parseError) {
        if (cancelled) return;
        setLinkResult(null);
        setLinkParsing(false);
        setLinkError(parseError instanceof ParseError ? parseError.message : String(parseError));
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rawText, isLink]);

  const messages = (linkResult?.messages ?? parsed?.messages) ?? [];
  const activeError = isLink ? linkError : error;
  const theme = getTheme(themeId);
  const platformHint = platform ? PLATFORM_INFO[platform] : null;
  const assistantLabel = platformHint?.name ?? 'AI';

  const handleLoadSample = useCallback((key: 'default' | 'tech') => {
    const sample = key === 'tech' ? TECH_SAMPLE : DEFAULT_SAMPLE;
    setRawText(sampleToText(sample));
    setTitle(sample.title);
  }, []);

  const exportPng = useCallback(async () => {
    const original = cardRef.current;
    if (!original || exporting) return;
    setExporting(true);
    try {
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:760px;z-index:-1;pointer-events:none;';
      const clone = original.cloneNode(true) as HTMLElement;
      holder.appendChild(clone);
      document.body.appendChild(holder);
      try {
        const canvas = await html2canvas(clone, {
          scale: 2,
          backgroundColor: null,
          useCORS: true,
          logging: false,
        });
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, `chat2card-${Date.now()}.png`, 'image/png');
        }, 'image/png');
      } finally {
        holder.remove();
      }
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const displayTitle = title.trim() || undefined;
      if (format === 'png') {
        void exportPng();
        return;
      }
      if (format === 'html') {
        const html = exportHtml(messages, displayTitle, theme, assistantLabel);
        downloadBlob(html, 'chat2card.html', 'text/html;charset=utf-8');
        return;
      }
      const md = exportMarkdown(messages, displayTitle);
      downloadBlob(md, 'chat2card.md', 'text/markdown;charset=utf-8');
    },
    [assistantLabel, exportPng, messages, theme, title],
  );

  return (
    <div className="site-shell">
      <nav className="site-nav">
        <div className="site-nav-inner">
          <a className="brand" href="./" aria-label="chat2card 首页">
            <span className="brand-mark" aria-hidden>c2</span>
            <span className="brand-name">chat2card</span>
          </a>

          <div className="nav-meta">
            <span>五大平台</span>
            <span className="nav-dot">·</span>
            <span>十二主题</span>
            <span className="nav-dot">·</span>
            <span>MIT</span>
          </div>

          <a
            className="nav-cta"
            href="https://github.com/cshouuu/chat2card"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </nav>

      <div className="app-shell">
        <header className="studio-intro">
          <div className="intro-copy">
            <span className="intro-eyebrow"><span /> CHAT2CARD STUDIO</span>
            <h1>把 AI 对话，变成<span>值得收藏</span>的卡片</h1>
            <p>粘贴公开分享链接或一段对话文本，选一套主题，直接导出适合社媒分享的卡片。</p>
          </div>
          <div className="intro-steps" aria-label="使用步骤">
            <span><b>01</b> 粘贴对话</span>
            <i />
            <span><b>02</b> 选择主题</span>
            <i />
            <span><b>03</b> 导出分享</span>
          </div>
        </header>

        <main className="studio-layout">
          <aside className="studio-sidebar">
            <Editor
              value={rawText}
              onChange={setRawText}
              error={activeError}
              messageCount={messages.length}
              onLoadSample={handleLoadSample}
              linkParsing={linkParsing}
              platformHint={platformHint}
            />
          </aside>

          <section className="studio-workspace">
            <Toolbar
              title={title}
              onTitleChange={setTitle}
              themeId={themeId}
              onThemeChange={setThemeId}
              onExport={handleExport}
              exporting={exporting}
            />
            <Preview cardRef={cardRef}>
              <Card
                ref={cardRef}
                messages={messages}
                title={title.trim() || undefined}
                theme={theme}
                assistantLabel={assistantLabel}
              />
            </Preview>
          </section>
        </main>

        <footer className="app-footer">
          <span>chat2card — Make AI dialogue worth sharing.</span>
          <span>文本本地处理 · 公开分享链接由解析服务读取 · MIT License</span>
        </footer>
      </div>
    </div>
  );
}
