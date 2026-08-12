<div align="center">

# 🎴 chat2card

**把 AI 对话一键变成精美分享卡片 / Turn AI conversations into beautiful shareable cards**

卡片生成与导出在浏览器完成 · 公开分享链接按平台解析
Card rendering and export stay client-side; public share links are fetched only when parsing is requested

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/cshouuu/chat2card/actions/workflows/ci.yml/badge.svg)](https://github.com/cshouuu/chat2card/actions/workflows/ci.yml)
[![PRs Welcome](https://github.com/cshouuu/chat2card/pulls)](https://github.com/cshouuu/chat2card/pulls)

</div>

---

**中文**: 粘贴 AI 对话分享链接或对话文本/JSON，实时预览，一键导出 PNG / 自包含 HTML / Markdown。ChatGPT / Gemini 通过轻量 parser service 读取公开分享数据；Claude / DeepSeek / 豆包目前通过 Jina Reader 做 best-effort 解析。

**English**: Paste a public AI conversation share link or raw conversation text/JSON, preview it live, and export PNG / self-contained HTML / Markdown. ChatGPT and Gemini use a lightweight parser service; Claude / DeepSeek / Doubao currently use Jina Reader on a best-effort basis.

---

## ✨ Features

- **No account required** — paste, preview, export.
- **Privacy-aware** — card rendering/export stays in the browser; public share-link parsing only fetches the public URL you submit.
- **Share link parsing**:

  | Platform | Support |
  |:---|:---|
  | Claude (`claude.ai/share/…`) | ✅ Full via Jina Reader |
  | DeepSeek (`chat.deepseek.com/share/…`) | ⚠️ Best-effort |
  | 豆包 (`doubao.com/thread/…`) | ⚠️ Best-effort |
  | ChatGPT (`chatgpt.com/share/…`, `chatgpt.com/s/…`) | ✅ Parser service |
  | Gemini (`gemini.google.com/share/…`, `share.gemini.google/…`, `g.co/gemini/share/…`) | ✅ Parser service |

- **Multiple input formats**
  - Plain text with role prefixes: `用户:` / `ChatGPT:` / `System:`
  - ChatGPT official export JSON (`conversations.json`)
- **6 themes** — Aurora, Midnight, Terminal, Paper, Ocean, Sunset
- **Export in 3 formats** — PNG, self-contained HTML, Markdown
- **Lightweight Markdown rendering** — code blocks, lists, quotes, bold, inline code, links

## 🚀 Quick Start

### Frontend

```bash
git clone https://github.com/cshouuu/chat2card.git
cd chat2card
npm install
npm run dev
```

### ChatGPT / Gemini parser service

The parser service uses Node 18+ built-in `fetch` and adds no runtime dependency.

```bash
npm run dev:parser
# http://localhost:8787
```

In development, the frontend automatically uses `http://localhost:8787`.

For production builds, configure:

```bash
VITE_PARSER_API=https://your-parser.example.com npm run build
```

The GitHub Pages workflow reads the repository variable `VITE_PARSER_API`, so after deploying `parser-service/server.mjs` to a Node-compatible host, add that URL in:

`Settings → Secrets and variables → Actions → Variables → VITE_PARSER_API`

The parser service accepts:

```http
POST /parse
Content-Type: application/json

{"url":"https://chatgpt.com/share/..."}
```

and returns the existing `ParsedChat` shape:

```json
{
  "title": "Example",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi" }
  ],
  "source": "link"
}
```

### How the new parsers work

- **ChatGPT**: fetches the public share page, decodes React Router `streamController.enqueue(...)` turbo-stream data, and reads `linear_conversation` / `messages`.
- **Gemini**: resolves the public share id, calls the public WIZ `batchexecute` RPC (`ujx1Bf`), then decodes the `wrb.fr` envelope.
- The service only accepts known ChatGPT / Gemini HTTPS share hosts and rejects arbitrary URLs.

## 🧪 Tests

```bash
npm test
npm run build
```

`npm test` runs both the existing Vitest suite and parser-service Node tests.

## 🎨 Screenshots

| Aurora (dark) | Ocean (light) |
|:---:|:---:|
| ![aurora](assets/aurora.png) | ![ocean](assets/ocean.png) |

## 📖 Paste mode

Plain text remains the safest fallback for private/sensitive conversations:

```text
用户: 帮我写一个 Python 快速排序
ChatGPT: 没问题，代码如下……
```

For ChatGPT official exports, paste one conversation object or the full `conversations.json` array.

## 🧱 Project Structure

```text
src/
├── core/
│   ├── parser.ts
│   ├── linkParser.ts
│   ├── markdown.ts
│   └── export.ts
├── themes/
├── components/
└── samples.ts

parser-service/
├── parsers.mjs
├── parsers.test.mjs
└── server.mjs
```

## 🤝 Contributing

PRs welcome. Useful next additions include more provider adapters, parser fixtures from additional live share-page variants, syntax highlighting, and more card themes.

## 📄 License

[MIT](LICENSE) © chat2card contributors

---

<p align="center"><sub>Made with 💜 · If chat2card helps you, give it a ⭐!</sub></p>
