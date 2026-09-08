# Architecture

## Runtime model
Sophisticate is a fully client-side Next.js application exported as static files for GitHub Pages. Video processing happens in the browser through FFmpeg WASM; there is no application server in the processing path.

## Layers

### App shell
`src/app/*` owns Next.js layout, global styles and page composition.

### Feature entry
`src/components/SophisticatePreview.tsx` creates the feature controller and passes it to the view.

### Application controller
`src/components/sophisticate/useSophisticateController.ts` coordinates file lifecycle, object URLs, metadata, encoding actions, keyboard shortcuts and derived UI state. It composes dedicated crop, playback and logging hooks.

This file is currently the main coupling point. New state domains should prefer dedicated hooks/services instead of continuing to expand the returned controller object.

### Presentation
`src/components/sophisticate/PreviewPane.tsx`, `SidebarControls.tsx`, `LogPanel.tsx`, `ProcessingOverlay.tsx`, `AppFooter.tsx` and related controls render the feature. They should not own FFmpeg lifecycle or encoding policy.

### Media pipeline
`src/lib/processVideo.ts` owns FFmpeg WASM loading, command construction, crop/trim/speed/fps/audio transforms, progress handling and output creation.

`src/lib/videoUtils.ts` owns pure calculations such as normalized crop conversion and target bitrate.

## Important contracts
- Object URLs must be revoked when replaced and on unmount.
- A cancelled encode must terminate the active FFmpeg instance and reset the singleton.
- UI state must not imply that an output satisfies a size limit unless the final Blob was checked against it.
- Static export must keep `basePath` and `assetPrefix` compatible with GitHub Pages.
- Runtime FFmpeg assets are part of the production dependency surface even though they are loaded from a CDN rather than bundled by npm.

## Current architecture risks
1. `useSophisticateController` is a broad facade that returns a large mutable surface. This makes UI components depend on more state than they need and encourages cross-domain changes.
2. The FFmpeg runtime is global/singleton state. The UI currently serializes processing, so future batch/concurrent work must not assume this layer is re-entrant.
3. Size targeting uses a CRF pass plus one ABR fallback, but the final result is returned without a hard postcondition that it is within the requested limit.
4. Several UI audit tests inspect source text rather than rendered behavior, which is useful as a temporary characterization technique but should not be the long-term regression boundary.
