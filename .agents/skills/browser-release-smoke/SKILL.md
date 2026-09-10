---
name: browser-release-smoke
description: Use before merging or releasing changes that can affect Sophisticate browser media behavior, FFmpeg runtime loading, framework runtime, or GitHub Pages deployment.
---

# Browser release smoke

Run against a production-style build under the configured base path when practical. Use Chromium because the application depends on browser media APIs and FFmpeg WASM.

## Scenario

1. Load an MP4 with audio.
2. Replace it by drag-and-drop and confirm the previous result is cleared.
3. Exercise one preset crop and crop-disabled mode.
4. Set trim start/end and verify preview boundaries.
5. Encode MP4, download it, and verify the file opens.
6. Encode WEBM and verify MIME/container behavior.
7. Start a longer encode, cancel it, then immediately start another encode.
8. Enable a small output-size limit and compare the final file size with that limit.
9. Verify keyboard shortcuts do not trigger destructive actions while editing a text field.
10. Verify the GitHub Pages route loads its locally deployed `/ffmpeg-core` assets without CDN dependency or base-path errors.

## Evidence

Record commit SHA, browser, input format/duration, output format, requested size limit, actual output size, and any console/network error. A successful static build or Pages deployment is not a substitute for this runtime evidence.
