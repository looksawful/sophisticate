# Sophisticate

[![CI](https://github.com/looksawful/sophisticate/actions/workflows/ci.yml/badge.svg)](https://github.com/looksawful/sophisticate/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/looksawful/sophisticate/actions/workflows/pages.yml/badge.svg)](https://github.com/looksawful/sophisticate/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)

Browser video crop and compression tool.

**Live:** <https://looksawful.github.io/sophisticate/>

## Features

- Drag-and-drop video upload
- Real-time crop preview
- Aspect presets and zoom
- MP4 / WEBM export with size target
- Cancel processing while encoding

## Run in Dev

Node 20 and FFmpeg CLI are the supported development baseline. FFmpeg CLI is used only to generate deterministic integration-test fixtures; application video processing still runs in the browser through FFmpeg WASM.

```bash
npm ci
npm run dev
```

## Validate

```bash
npm run check
```

This runs lint, TypeScript validation, Vitest and the production build. See [Testing and validation](docs/TESTING.md) for the browser smoke matrix.

## Engineering docs

- [Agent guide](AGENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing and validation](docs/TESTING.md)
- [Media pipeline audit skill](.agents/skills/media-pipeline-audit.md)
- [Browser release smoke skill](.agents/skills/browser-release-smoke.md)

![Sophisticate interface](image.png)
