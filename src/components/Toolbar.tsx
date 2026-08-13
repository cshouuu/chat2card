import { THEMES } from '../themes';

interface ToolbarProps {
  title: string;
  onTitleChange: (v: string) => void;
  themeId: string;
  onThemeChange: (id: string) => void;
  onExport: (format: 'png' | 'html' | 'md') => void;
  exporting: boolean;
}

const CATEGORY_LABEL = {
  premium: '高级',
  fun: '有趣',
  tech: '科技',
  calm: '简洁',
} as const;

export default function Toolbar({ title, onTitleChange, themeId, onThemeChange, onExport, exporting }: ToolbarProps) {
  const activeTheme = THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];

  return (
    <section className="studio-toolbar">
      <div className="studio-toolbar-top">
        <div className="title-control">
          <div className="control-kicker">CARD TITLE</div>
          <div className="title-control-row">
            <input
              id="title-input"
              className="title-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="给这段对话一个值得分享的标题"
              maxLength={60}
            />
            <span className="title-count">{title.length}/60</span>
          </div>
        </div>

        <div className="export-control">
          <div className="control-kicker">EXPORT</div>
          <div className="export-btns">
            <button className="btn btn-primary" onClick={() => onExport('png')} disabled={exporting}>
              <span className="btn-icon">↗</span>
              {exporting ? '生成中…' : 'PNG'}
            </button>
            <button className="btn" onClick={() => onExport('html')}>
              HTML
            </button>
            <button className="btn" onClick={() => onExport('md')}>
              Markdown
            </button>
          </div>
        </div>
      </div>

      <div className="theme-section">
        <div className="theme-section-head">
          <div>
            <div className="control-kicker">THEME GALLERY · {THEMES.length} THEMES</div>
            <div className="theme-active-title">
              <strong>{activeTheme.name}</strong>
              <span>{activeTheme.desc}</span>
            </div>
          </div>
          <span className={`theme-category theme-category-${activeTheme.category}`}>{CATEGORY_LABEL[activeTheme.category]}</span>
        </div>

        <div className="theme-gallery" role="list" aria-label="卡片主题">
          {THEMES.map((theme) => {
            const active = theme.id === themeId;
            return (
              <button
                key={theme.id}
                type="button"
                role="listitem"
                className={`theme-tile ${active ? 'active' : ''}`}
                onClick={() => onThemeChange(theme.id)}
                title={theme.desc}
                aria-pressed={active}
              >
                <span className="theme-preview" style={{ background: theme.preview }}>
                  <span className="theme-preview-line theme-preview-line-lg" />
                  <span className="theme-preview-line" />
                  <span className="theme-preview-card" />
                  {active ? <span className="theme-selected">✓</span> : null}
                </span>
                <span className="theme-tile-name">{theme.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
