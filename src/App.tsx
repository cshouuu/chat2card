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
    .map((m) => {
      const label = m.role === 'user' ? '用户' : m.role === 'system' ? '系统' : 'ChatGPT';
      return `${label}: ${m.content}`;
    })
    .join('\n\n');
}

export default function App() {
  const [rawText, setRawText] = useState(() => sampleToText(DEFAULT_SAMPLE));
  const [title, setTitle] = useState(DEFAULT_SAMPLE.title);
  const [themeId, setThemeId] = useState('aurora');
  const [exporting, setExporting] = useState(false);
  const [linkParsing, setLinkParsing] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<Awaited<ReturnType<typeof parseShareLink>> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isLink = isShareLink(rawText);
  const platform = isLink ? detectPlatform(rawText.trim()) : null;

  // 文本/JSON 同步解析(仅非链接模式)
  const { parsed, error } = useMemo(() => {
    if (isLink) return { parsed: null, error: null };
    try {
      return { parsed: parseChat(rawText), error: null };
    } catch (e) {
      return { parsed: null, error: e instanceof ParseError ? e.message : String(e) };
    }
  }, [rawText, isLink]);

  // 链接异步解析(300ms 防抖 + 取消保护)
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
        // Claude 等平台分享页无标题字段,解析后应清空旧标题
        setTitle(result.title ?? '');
      } catch (e) {
        if (cancelled) return;
        setLinkResult(null);
        setLinkParsing(false);
        setLinkError(e instanceof ParseError ? e.message : String(e));
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
      // 克隆到屏幕外容器,避免预览缩放影响截图尺寸
      const holder = document.createElement('div');
      holder.style.cssText =
        'position:fixed;left:-9999px;top:0;width:760px;z-index:-1;pointer-events:none;';
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
        const html = exportHtml(messages, displayTitle, theme);
        downloadBlob(html, 'chat2card.html', 'text/html;charset=utf-8');
        return;
      }
      if (format === 'md') {
        const md = exportMarkdown(messages, displayTitle);
        downloadBlob(md, 'chat2card.md', 'text/markdown;charset=utf-8');
      }
    },
    [exportPng, messages, theme, title],
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#lg)" />
            <circle cx="22" cy="30" r="6" fill="#fff" />
            <circle cx="42" cy="30" r="6" fill="#fff" opacity="0.55" />
            <path
              d="M22 44 L22 48 L32 44"
              fill="none"
              stroke="#fff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="brand-name">
            chat<span>2</span>card
          </span>
        </div>
        <div className="topbar-right">
          <span className="slogan">把 AI 对话变成精美分享卡片</span>
          <a
            className="btn btn-ghost"
            href="https://github.com/cshouuu/chat2card"
            target="_blank"
            rel="noopener noreferrer"
          >
            ⭐ Star on GitHub
          </a>
        </div>
      </header>

      <Toolbar
        title={title}
        onTitleChange={setTitle}
        themeId={themeId}
        onThemeChange={setThemeId}
        onExport={handleExport}
        exporting={exporting}
      />

      <main className="workspace">
        <Editor
          value={rawText}
          onChange={setRawText}
          error={activeError}
          messageCount={messages.length}
          onLoadSample={handleLoadSample}
          linkParsing={linkParsing}
          platformHint={platformHint}
        />
        <Preview>
          {(ref) => <Card ref={ref} messages={messages} title={title.trim() || undefined} theme={theme} />}
        </Preview>
      </main>

      <footer className="app-footer">
        chat2card · 纯前端,对话不会离开你的浏览器 · MIT License
      </footer>
    </div>
  );
}
