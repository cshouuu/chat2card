# Contributing

Thanks for your interest in contributing to chat2card! 🎉

## Development setup

```bash
git clone https://github.com/yourname/chat2card.git
cd chat2card
npm install
npm run dev
```

## Before submitting a PR

1. Run tests: `npm test`
2. Run build: `npm run build` (also runs the TypeScript type check)
3. Keep the scope of your change focused. If it's a new feature, open an issue first to discuss it.

## Code style

- TypeScript, strict mode enabled
- Framework-agnostic logic (parsers, renderers, exporters) lives in `src/core/` — keep it free of React imports
- Every new parser / renderer should come with unit tests in the same folder (`*.test.ts`)

## What to work on

Check the [issues](https://github.com/yourname/chat2card/issues) tab, or pick from:

- New conversation format parsers (Claude, Gemini, Kimi…)
- New themes
- In-browser code syntax highlighting
- Better i18n

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
