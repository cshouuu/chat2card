interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  messageCount: number;
  onLoadSample: (key: 'default' | 'tech') => void;
  linkParsing?: boolean;
  platformHint?: { name: string; support: 'full' | 'best-effort' | 'blocked' } | null;
}

const PROVIDERS = [
  { name: 'ChatGPT', mark: '◎' },
  { name: 'Gemini', mark: '✦' },
  { name: 'Claude', mark: '✳' },
  { name: 'DeepSeek', mark: '◒' },
  { name: '豆包', mark: '●' },
];

const SUPPORT_LABEL: Record<string, string> = {
  full: '完整支持',
  'best-effort': '尽力解析',
  blocked: '暂不支持',
};

export default function Editor({
  value,
  onChange,
  error,
  messageCount,
  onLoadSample,
  linkParsing,
  platformHint,
}: EditorProps) {
  const activeProvider = platformHint?.name;

  return (
    <section className="import-panel">
      <div className="import-head">
        <div>
          <div className="control-kicker">IMPORT CONVERSATION</div>
          <h2>导入一段 AI 对话</h2>
          <p>粘贴公开分享链接、纯文本或 ChatGPT 导出 JSON，系统会自动识别。</p>
        </div>
        <div className="sample-actions">
          <button className="btn btn-ghost" onClick={() => onLoadSample('default')} title="加载通用示例对话">
            示例 A
          </button>
          <button className="btn btn-ghost" onClick={() => onLoadSample('tech')} title="加载技术问答示例">
            示例 B
          </button>
        </div>
      </div>

      <div className="provider-block">
        <div className="field-label-row">
          <span className="field-label">支持的平台</span>
          <span className="field-meta">公开分享链接 · 图片/文件会自动带入卡片</span>
        </div>
        <div className="provider-list">
          {PROVIDERS.map((provider) => (
            <span key={provider.name} className={`provider-pill ${activeProvider === provider.name ? 'active' : ''}`}>
              <span className="provider-mark">{provider.mark}</span>
              {provider.name}
            </span>
          ))}
        </div>
      </div>

      <div className="editor-field">
        <div className="field-label-row">
          <label className="field-label" htmlFor="conversation-editor">对话内容 / 分享链接</label>
          <span className="field-meta">{value.length.toLocaleString()} 字符</span>
        </div>
        <div className="editor-frame">
          <textarea
            id="conversation-editor"
            className="editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={'粘贴 AI 分享链接或对话内容…\n\n例如：\nhttps://chatgpt.com/s/...\nhttps://claude.ai/share/...\n\n也可以直接粘贴：\n用户: 你好\nAI: 你好，有什么可以帮你？'}
            spellCheck={false}
          />
          <div className="editor-frame-footer">
            <span>支持 Markdown · 多轮对话 · 图片/附件</span>
            <span>{messageCount} 条消息</span>
          </div>
        </div>
      </div>

      <div className={`parse-status ${error ? 'is-error' : linkParsing ? 'is-loading' : 'is-success'}`}>
        <span className="status-icon">{linkParsing ? '···' : error ? '!' : '✓'}</span>
        <div>
          <strong>
            {linkParsing
              ? `正在解析${platformHint ? ` ${platformHint.name}` : ''} 分享链接`
              : error
                ? '解析遇到问题'
                : platformHint && messageCount > 0
                  ? `${platformHint.name} 已解析完成`
                  : '内容已就绪'}
          </strong>
          <p>
            {linkParsing
              ? '正在读取公开分享页并整理消息、图片与附件。'
              : error
                ? error
                : platformHint && messageCount > 0
                  ? `共提取 ${messageCount} 条消息 · ${SUPPORT_LABEL[platformHint.support] ?? '已支持'}`
                  : `已识别 ${messageCount} 条消息，右侧卡片会实时更新。`}
          </p>
        </div>
      </div>

      <div className="privacy-note">
        <span className="privacy-icon">⌁</span>
        <div>
          <strong>隐私说明</strong>
          <p>手动粘贴的文本 / JSON 只在浏览器中处理；公开分享链接会请求 chat2card 解析服务。敏感内容建议直接粘贴文本。</p>
        </div>
      </div>
    </section>
  );
}
