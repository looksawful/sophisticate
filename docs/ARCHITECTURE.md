# Architecture

## Runtime model

Sophisticate is a fully client-side Next.js application exported as static files for GitHub Pages. Video processing happens in the browser through FFmpeg WASM; there is no application server in the processing path.

The pinned `@ffmpeg/core` package is an application runtime dependency. `postinstall` copies its JavaScript and WASM artifacts into `public/ffmpeg-core/`, and the browser loads them through the configured GitHub Pages base path. Production processing therefore does not depend on a third-party runtime CDN.

## Ownership map

### App shell
`src/app/*` owns Next.js layout, global styles, and page composition.

### Feature entry
`src/components/SophisticatePreview.tsx` creates the feature controller and passes it to presentation components.

### Application controller
`src/components/sophisticate/useSophisticateController.ts` coordinates file/object-URL lifecycle, metadata, encoding actions, keyboard shortcuts, and derived UI state. It composes dedicated crop, playback, and logging hooks.

The returned controller remains the main coupling point. New state domains should prefer focused owners rather than expanding this facade further.

### Presentation
`src/components/sophisticate/*` presentation components render controls, preview, progress, logs, and result state. They should not own FFmpeg lifecycle or encoding policy.

### Media pipeline
`src/lib/processVideo.ts` owns FFmpeg WASM loading, command construction, crop/trim/speed/fps/audio transforms, progress handling, bounded size-limit retries, cleanup, and output creation.

`src/lib/videoUtils.ts` owns pure calculations such as normalized crop conversion and target bitrate.

## Runtime contracts

- Object URLs are revoked when replaced and on component cleanup.
- A cancelled encode terminates the active FFmpeg instance and prevents reuse of that cancelled instance.
- Disabled crop omits the crop filter instead of applying a full-frame crop.
- Disabled size limiting omits the size ceiling rather than using a sentinel maximum.
- When a size limit is enabled, the final Blob is checked. The pipeline performs bounded fallback attempts and throws if the final artifact still exceeds the configured limit.
- GitHub Pages `basePath` and `assetPrefix` must also resolve `/ffmpeg-core` runtime assets correctly.

## Current risks and debt

1. `useSophisticateController` still exposes a broad cross-domain surface. Track the behavior-preserving narrowing in issue #8 before large multi-file work.
2. FFmpeg is held as singleton runtime state. Current UI processing is serialized; future batch/concurrent work must not assume this layer is re-entrant.
3. `src/components/sophisticate/ui-audit.test.ts` still contains source-text characterization checks. Migrate durable contracts to rendered behavioral tests under issue #7.
4. Free crop still derives an aspect ratio from custom width/height instead of providing unconstrained resizing. Issue #2 remains a real product defect.
5. Browser FFmpeg/framework behavior is not exercised by the automated CI gate. Runtime-changing merges require the manual Chromium smoke workflow.
