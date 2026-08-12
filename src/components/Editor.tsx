interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  messageCount: number;
  onLoadSample: (key: 'default' | 'tech') => void;
}

export default function Editor({ value, onChange, error, messageCount, onLoadSample }: EditorProps) {
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
          placeholder={'在这里粘贴你的 AI 对话…\n\n支持两种格式:\n\n1) 纯文本(带角色前缀):\n用户: 你好\nChatGPT: 你好!\n\n2) ChatGPT 官方导出 JSON:\n直接粘贴 conversation.json 的内容'}
          spellCheck={false}
        />
        <div className={`editor-status ${error ? 'is-error' : ''}`}>
          {error ? (
            <span>⚠ {error}</span>
          ) : (
            <span>✓ 已解析 {messageCount} 条消息</span>
          )}
        </div>
      </div>
    </section>
  );
}
