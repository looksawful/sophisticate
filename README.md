# Sophisticate

[![CI](https://github.com/looksawful/sophisticate/actions/workflows/ci.yml/badge.svg)](https://github.com/looksawful/sophisticate/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/looksawful/sophisticate/actions/workflows/pages.yml/badge.svg)](https://github.com/looksawful/sophisticate/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Sophisticate crops, trims, compresses, and converts video entirely in the browser with FFmpeg WASM. Files are processed locally in the browser rather than sent to an application server.

**Live:** <https://looksawful.github.io/sophisticate/>

## Features

- Drag and drop or paste a video
- Crop preview with aspect-ratio presets and a custom ratio
- Trim start and end points
- Change playback speed and output frame rate
- Include or remove audio from the output
- Export MP4 or WEBM
- Set an optional maximum output size
- Stop an active encode

When a file-size limit is enabled, Sophisticate checks the final encoded file. If bounded fallback attempts still cannot meet the limit, processing fails instead of returning an oversized result.

## Development

Use Node 20. A local FFmpeg CLI is required only to generate deterministic test fixtures; application encoding uses FFmpeg WASM in the browser.

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run check
```

This runs lint, typecheck, Vitest, and the production build. Changes to media processing, FFmpeg runtime loading, framework runtime, or GitHub Pages routing also require the Chromium browser smoke described in `.agents/skills/browser-release-smoke/SKILL.md`.

The current TypeScript configuration is not strict. A successful typecheck confirms the configured compiler check passes; strict TypeScript migration is tracked separately.

## Engineering documentation

- [Agent instructions](AGENTS.md) — repository operating rules
- [Architecture](docs/ARCHITECTURE.md) — runtime structure and module responsibilities
- [Testing and validation](docs/TESTING.md) — validation layers and browser testing
- [Roadmap](docs/ROADMAP.md) — engineering work order and release dependencies
- [Media pipeline audit skill](.agents/skills/media-pipeline-audit/SKILL.md) — review workflow for media-processing changes
- [Browser release smoke skill](.agents/skills/browser-release-smoke/SKILL.md) — browser/runtime validation workflow

![Sophisticate interface](image.png)
