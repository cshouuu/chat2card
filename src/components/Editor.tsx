interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  messageCount: number;
  onLoadSample: (key: 'default' | 'tech') => void;
  linkParsing?: boolean;
  platformHint?: { name: string; support: 'full' | 'best-effort' | 'blocked' } | null;
}

const SUPPORT_LABEL: Record<string, string> = {
  full: '完美支持',
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
  return (
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="panel-head">
        <h2>
          <span className="panel-dot" /> 对话内容
        </h2>
        <div className="panel-actions">
          <button className="btn btn-ghost" onClick={() => onLoadSample('default')} title="加载示例对话">
            示例一
          </button>
          <button className="btn btn-ghost" onClick={() => onLoadSample('tech')} title="加载技术问答示例">
            示例二
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <textarea
          className="editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            '粘贴 AI 对话或分享链接,自动识别解析…\n\n支持三种输入:\n\n1) 分享链接(推荐):\nhttps://claude.ai/share/xxxx\nhttps://chat.deepseek.com/share/xxxx\nhttps://www.doubao.com/thread/xxxx\n\n2) 纯文本(带角色前缀):\n用户: 你好\nChatGPT: 你好!\n\n3) ChatGPT 官方导出 JSON:\n粘贴 conversation.json 内容'
          }
          spellCheck={false}
        />
        <div className={`editor-status ${error ? 'is-error' : ''}`}>
          {linkParsing ? (
            <span>⏳ 正在解析分享链接{platformHint ? `(${platformHint.name})` : ''}…</span>
          ) : error ? (
            <span>⚠ {error}</span>
          ) : platformHint && messageCount > 0 ? (
            <span>
              ✅ 已从 {platformHint.name} 分享链接解析出 <b>{messageCount}</b> 条消息
            </span>
          ) : platformHint ? (
            <span>
              🔗 已识别 {platformHint.name} 分享链接 · 支持度:
              <b> {SUPPORT_LABEL[platformHint.support]}</b>
              {platformHint.support !== 'full' ? ' · 也可复制文本直接粘贴' : ''}
            </span>
          ) : (
            <span>✓ 已解析 {messageCount} 条消息</span>
          )}
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            background: 'rgba(124,127,242,0.05)',
          }}
        >
          🔒 粘贴文本/JSON 完全本地处理;分享链接解析需经第三方服务(r.jina.ai)中转,敏感对话请用粘贴模式。
          <br />
          平台支持:Claude ✅ · DeepSeek/豆包 ⚠️ 尽力 · ChatGPT/Gemini ❌(需登录或反爬)
        </div>
      </div>
    </section>
  );
}
