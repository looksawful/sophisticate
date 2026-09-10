# Testing and validation

## Local gate

```bash
npm ci
npm run check
```

`npm run check` runs lint, typecheck, Vitest, and the production build. `pretest` generates deterministic MP4 fixtures, so a local FFmpeg CLI is required. CI installs that dependency explicitly.

The repository currently uses `strict: false`. A green typecheck proves the configured TypeScript check passes; it is not a strict-type-safety guarantee. Strict migration is tracked in #18.

## What each layer proves

### Pure logic

Use unit tests for deterministic calculations and policies such as crop normalization, bitrate calculations, and command planning.

These tests do not prove browser media support or FFmpeg WASM loading.

### Media processing

Mock the FFmpeg adapter only where necessary. Verify command semantics, cleanup, cancellation behavior, output MIME type, disabled stages, runtime paths, and final size postconditions.

Mocked engine tests do not prove that codecs or WASM work in a real browser.

### UI behavior

Prefer rendered DOM and user-event tests for controls, disabled states, keyboard actions, and state transitions. Source-text assertions are temporary characterization checks and should not be the long-term regression boundary. Issue #7 tracks this migration.

### Browser runtime

Changes to FFmpeg loading, codecs, media semantics, framework runtime, or GitHub Pages routing require the Chromium workflow in `.agents/skills/browser-release-smoke/SKILL.md`.

A successful static build or Pages deployment does not prove browser codec behavior, FFmpeg WASM initialization, or a successful encode.

## Current release status

As of 2026-09-10, the audit/remediation branch passes its canonical CI gate. The dedicated Chromium smoke v3 reaches the real FFmpeg WASM browser step and fails there after setup, build, and server preparation succeed.

The runtime-affecting PR must not be treated as browser-validated until that failure is resolved or explicitly accepted as release risk.

## CI and Pages

Treat repository CI and GitHub Pages deployment as separate signals:

- CI checks install, dependency reporting, lint, typecheck, tests, and build.
- Pages checks static deployment.
- Chromium smoke checks the browser media runtime.

Success in one layer does not replace another required layer.
