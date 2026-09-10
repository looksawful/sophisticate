# Architecture

## Runtime model

Sophisticate is a statically exported Next.js application. Video encoding runs in the browser through FFmpeg WASM; no application server participates in the processing path.

The installed `@ffmpeg/core` package supplies the runtime files. `postinstall` copies its JavaScript and WASM artifacts into `public/ffmpeg-core/`, and the browser resolves them through the configured GitHub Pages base path. Production processing does not depend on a third-party runtime CDN.

## Module responsibilities

### App shell

`src/app/*` contains the Next.js layout, global styles, metadata, and page composition.

### Feature entry

`src/components/SophisticatePreview.tsx` creates the feature controller and passes it into the view.

### Application state and actions

`src/components/sophisticate/useSophisticateController.ts` coordinates source-file lifecycle, metadata, processing actions, keyboard shortcuts, result state, and derived UI state. Crop, playback, and logging state already live in focused hooks.

The controller is still the main cross-domain coupling point. Issue #8 tracks narrowing the state/view boundary before multi-video work expands it further.

### Presentation

`src/components/sophisticate/*` renders controls, preview, timeline, progress, logs, and output state. Presentation components should not own FFmpeg lifecycle or encoding policy.

### Media processing

`src/lib/processVideo.ts` currently combines FFmpeg loading, command construction, transforms, execution, retries, progress, cleanup, and output creation. Issue #16 tracks separating pure command planning from FFmpeg session lifecycle and orchestration.

`src/lib/videoUtils.ts` contains pure media calculations such as crop normalization and target bitrate.

## Behavior rules

- Revoke object URLs when their source/result is replaced and on component cleanup.
- Disabled crop must omit the crop filter rather than apply a hidden full-frame crop.
- Disabled size limiting must omit the size ceiling and fallback logic.
- When a size limit is enabled, success requires the final encoded Blob to satisfy the configured maximum. Bounded fallback may retry; unresolved overshoot must fail explicitly.
- GitHub Pages `basePath` and `assetPrefix` must resolve the deployed FFmpeg runtime files correctly.
- Cancellation terminates an active FFmpeg encode. Cancellation during FFmpeg initialization is a known gap tracked in #14.
- Current processing is serialized. Do not assume the module-global FFmpeg state is safe for concurrent jobs.

## Known architecture gaps

- #13: trim boundaries need one shared normalization rule.
- #14: processing runs need cancellation/session identity across initialization, encoding, and fallback stages.
- #15: processing options need explicit validation and reset/persistence rules.
- #16: media planning, FFmpeg session lifecycle, and orchestration are still combined.
- #8: the controller/view boundary remains broad.
- #7: several UI tests still inspect source text instead of rendered behavior.
- #17: keyboard, programmatic labels/status, tooltip semantics, and reduced-motion behavior need stronger coverage.
- #18: TypeScript currently runs with `strict: false`.
- #2: the UI label historically called `Free` still represents a custom fixed aspect ratio rather than unconstrained crop.

Work order and release dependencies belong in [ROADMAP.md](ROADMAP.md), not in this architecture description.
