# Browser release smoke

Use before a release or after changes to media loading, controls, playback, processing or deployment.

## Setup
Run the production-style build and serve it under the configured base path when practical. Test in Chromium because the application relies on browser media APIs and FFmpeg WASM.

## Scenario
1. Load an MP4 with audio by file picker.
2. Replace it using drag-and-drop and confirm the previous result is cleared.
3. Exercise one preset crop and crop-disabled mode.
4. Set trim start/end and verify preview boundaries.
5. Encode MP4, download it, and verify the file opens.
6. Encode WEBM and verify MIME/container behavior.
7. Start a longer encode, cancel it, then immediately start another encode.
8. Enable a small output-size limit and compare the final Blob/file size with that limit.
9. Verify keyboard shortcuts do not fire destructive actions while editing a text field.
10. Repeat the live GitHub Pages route to catch base-path/runtime-CDN failures.

## Evidence
Record browser, commit SHA, input format/duration, output format, requested limit, actual output size and any console error. A successful static deployment alone is not runtime media evidence.
