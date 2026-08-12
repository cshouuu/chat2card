<div align="center">

# 🎴 chat2card

**把 AI 对话一键变成精美分享卡片 / Turn AI conversations into beautiful shareable cards**

纯前端 · 零后端 · 对话不会离开你的浏览器
100% client-side — your conversations never leave the browser

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/yourname/chat2card/actions/workflows/ci.yml/badge.svg)](https://github.com/yourname/chat2card/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/yourname/chat2card/pulls)

</div>

---

**中文**:粘贴 ChatGPT / Claude / 豆包等 AI 对话(纯文本或 ChatGPT 官方导出 JSON),实时预览,一键导出 PNG 图片 / 自包含 HTML / Markdown。6 套主题,适合发朋友圈、写公众号、做技术分享、存档对话。

**English**: Paste an AI conversation (plain text or ChatGPT's official export JSON), preview it live, and export it as a beautiful PNG image / self-contained HTML / Markdown. 6 built-in themes. Perfect for sharing on social media, writing blog posts, or archiving chats.

---

## ✨ Features

- **Zero config** — open the demo, paste your chat, export. No signup, no API keys, no backend.
- **Privacy first** — everything runs in your browser via pure client-side code.
- **Multiple input formats**
  - Plain text with role prefixes: `用户:` / `ChatGPT:` / `System:` (中英文均可)
  - ChatGPT official export JSON (`conversation.json`)
- **6 themes** — Aurora, Midnight, Terminal, Paper, Ocean, Sunset
- **Export in 3 formats** — PNG (2× resolution, 760px wide), self-contained HTML, Markdown
- **Lightweight Markdown rendering** — code blocks, lists, quotes, bold, inline code, links (XSS-safe: escape-first)
- **Built-in samples** — see the full effect in 3 seconds

## 🚀 Quick Start

### Option A: Use the online demo

Open the demo below, click 示例一 / 示例二, or paste your own conversation:

> **Live Demo**: https://yourname.github.io/chat2card/

### Option B: Run locally

```bash
# clone
git clone https://github.com/yourname/chat2card.git
cd chat2card

npm install
npm run dev        # development server → http://localhost:5173

npm test           # run unit tests
npm run build      # production build → dist/
```

## 🎨 Screenshots

| Aurora (dark) | Ocean (light) |
|:---:|:---:|
| ![aurora](assets/aurora.png) | ![ocean](assets/ocean.png) |

## 📖 How to paste conversations

**Plain text** (role prefix per line, empty line separates paragraphs):

```
用户: 帮我写一个 Python 快速排序
ChatGPT: 没问题,代码块长这样:

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    return (quicksort([x for x in arr if x < pivot])
            + [x for x in arr if x == pivot]
            + quicksort([x for x in arr if x > pivot]))
```
```

**ChatGPT export JSON**: In ChatGPT → Settings → Data controls → Export data. Unzip it, open `conversations.json`, and paste a conversation object (or the whole array) into the editor.

## 🧱 Project Structure

```
src/
├── core/            # framework-agnostic logic
│   ├── parser.ts    # plain text + ChatGPT JSON parsers
│   ├── markdown.ts  # lightweight, escape-first Markdown renderer
│   └── export.ts    # Markdown / self-contained HTML export
├── themes/          # card theme definitions
├── components/      # React UI (Editor / Preview / Card / Toolbar)
└── samples.ts       # built-in sample conversations
```

## 🤝 Contributing

PRs welcome! Ideas we'd love to see:

- More conversation formats (Claude, Gemini, Kimi…)
- More themes
- In-browser syntax highlighting for code blocks
- Copy-to-clipboard for the exported image

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

[MIT](LICENSE) © chat2card contributors

---

<p align="center"><sub>Made with 💜 · If chat2card helps you, give it a ⭐!</sub></p>
