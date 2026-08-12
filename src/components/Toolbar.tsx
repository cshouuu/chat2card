import { THEMES } from '../themes/themes';

interface ToolbarProps {
  title: string;
  onTitleChange: (v: string) => void;
  themeId: string;
  onThemeChange: (id: string) => void;
  onExport: (format: 'png' | 'html' | 'md') => void;
  exporting: boolean;
}

export default function Toolbar({ title, onTitleChange, themeId, onThemeChange, onExport, exporting }: ToolbarProps) {
  return (
    <section className="toolbar">
      <div className="toolbar-group" style={{ flex: 1, minWidth: 180 }}>
        <label className="toolbar-label" htmlFor="title-input">
          标题
        </label>
        <input
          id="title-input"
          className="input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="对话标题(可选)"
          maxLength={60}
        />
      </div>

      <div className="toolbar-group" style={{ flex: 1.4 }}>
        <span className="toolbar-label">主题</span>
        <div className="theme-switcher">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-chip ${t.id === themeId ? 'active' : ''}`}
              onClick={() => onThemeChange(t.id)}
              title={t.desc}
            >
              <span
                className="theme-swatch"
                style={{ background: t.background, borderColor: t.id === themeId ? 'var(--accent)' : 'transparent' }}
              />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">导出</span>
        <div className="export-btns">
          <button className="btn btn-primary" onClick={() => onExport('png')} disabled={exporting}>
            {exporting ? '生成中…' : 'PNG 图片'}
          </button>
          <button className="btn" onClick={() => onExport('html')}>
            HTML
          </button>
          <button className="btn" onClick={() => onExport('md')}>
            Markdown
          </button>
        </div>
      </div>
    </section>
  );
}
