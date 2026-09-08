# Sophisticate agent guide

## Scope
Sophisticate is a client-side Next.js video crop/compression tool. Treat browser media behavior, FFmpeg WASM lifecycle, object URL cleanup, crop math, trim boundaries, output size guarantees, and GitHub Pages static-export constraints as production behavior.

## Working rules
- Preserve the browser-only architecture unless an issue explicitly changes it.
- Do not move media processing server-side by accident.
- Do not change crop/trim/size semantics while doing UI refactors.
- Never claim output-size compliance without checking the final encoded Blob size.
- Keep FFmpeg cancellation and temporary-file cleanup covered by tests.
- Revoke every created object URL on replacement/unmount.
- Keep GitHub Pages `basePath` / static export working.
- Avoid grep-only deletion decisions. Prove imports, runtime consumers, routes and tests first.
- Prefer behavior tests over tests that only search source text.

## Required checks
Run before merge:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

For media-pipeline changes, also verify manually in Chromium with at least:
1. MP4 with audio.
2. WEBM.
3. crop disabled and enabled.
4. trim start/end.
5. speed 0.5x and 2x.
6. cancellation during encode.
7. size-limited export and final Blob size.

## Architecture map
- `src/components/SophisticatePreview.tsx`: client entry component.
- `src/components/sophisticate/useSophisticateController.ts`: UI/application orchestration.
- `src/components/sophisticate/hooks/*`: crop, playback and logging state.
- `src/components/sophisticate/*Pane|*Controls|*Overlay`: presentation.
- `src/lib/processVideo.ts`: FFmpeg WASM execution and output sizing.
- `src/lib/videoUtils.ts`: pure crop/bitrate helpers.

## Change policy
Small changes should stay inside one owner layer. If a change touches UI state, encoding semantics and deployment configuration together, split it unless the coupling is unavoidable and documented in the PR.