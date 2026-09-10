# Testing and validation

## Automated gate

The canonical local gate is:

```bash
npm ci
npm run check
```

`npm run check` runs lint, TypeScript validation, Vitest, and the production build. `pretest` generates deterministic MP4 fixtures, so a local FFmpeg CLI is required. CI installs that dependency explicitly.

## Test layers

### Pure logic
Keep crop math, bitrate calculations, and deterministic command policy covered by unit tests.

### Media pipeline
Mock FFmpeg only where necessary. Tests should verify command semantics, cleanup, cancellation, output MIME type, disabled-stage behavior, runtime asset paths, and size-limit postconditions.

### UI behavior
Prefer rendered DOM/user-event tests for controls, disabled states, keyboard commands, and state transitions. Source-text assertions are temporary characterization evidence, not the preferred long-term regression boundary.

### Browser runtime smoke
Before merging or releasing changes to FFmpeg loading, codecs, media semantics, framework runtime, or Pages routing, follow `.agents/skills/browser-release-smoke/SKILL.md` in Chromium.

A successful static build or Pages deployment proves neither browser codec behavior nor FFmpeg WASM initialization.

## Current audited baseline

The latest clean GitHub Actions validation on the audit branch completed install, dependency audit, lint, typecheck, deterministic fixture generation, Vitest, and production build successfully. It reported 13 passing test files / 207 passing tests and zero npm-audit vulnerabilities.

That run did not provide real Chromium media-processing evidence. Browser smoke therefore remains the merge gate for the runtime-affecting audit PR.

## CI troubleshooting

Treat `CI / validate` and Pages deployment as separate signals. Pages success does not substitute for lint, typecheck, tests, or build; automated CI success does not substitute for the browser smoke workflow when the runtime surface changed.
