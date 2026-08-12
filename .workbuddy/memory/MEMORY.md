# chat2card 项目长期记忆

## 项目信息
- **仓库**:https://github.com/cshouuu/chat2card (用户 GitHub 用户名:**cshouuu**)
- **定位**:把 AI 对话(ChatGPT/Claude 等)一键变精美分享卡片/长图的开源项目
- **目的**:为用户申请 OpenAI Codex for OSS 攒 star 打底
- **技术栈**:Vite 5 + React 18 + TS strict + Vitest + html2canvas;纯前端,零后端

## 项目约定
- README 中英双语,英文为主;License MIT
- 框架无关逻辑(parser/render/export)放 src/core/,禁止引入 React
- 新解析器/渲染器必须配 `*.test.ts` 单元测试
- 卡片固定宽 760px,颜色全部内联(html2canvas 截图 + HTML 导出一致性)
- 页脚文案含 `github.com/cshouuu/chat2card`,改用户名时记得同步 6 个文件(README/CONTRIBUTING/App/Card/export/samples)

## 待办
- [ ] 用户 push 到 GitHub + 开 Pages 后,回填 README 的 Live Demo 链接
- [ ] 达到 star 后填写 Codex for OSS 申请表
