# Media pipeline audit

Use this workflow for changes to `src/lib/processVideo.ts`, output settings, cancellation, crop/trim/speed/fps/audio transforms or FFmpeg runtime loading.

## Evidence to collect
1. Trace the UI setting to the `ProcessOptions` value.
2. Trace that value into the exact FFmpeg arguments.
3. Verify duration math after trim, loop and speed changes.
4. Verify audio filtering stays valid for supported speed values.
5. Verify listeners and temporary virtual-FS files are removed on success, error and cancellation.
6. Verify a cancelled FFmpeg instance is not reused.
7. For size-limited output, check the final Blob size, not only an intermediate pass.

## Required validation
- Pure helper/unit tests for deterministic math.
- Command-semantics tests for the touched processing option.
- Real Chromium smoke test for changed media behavior.
- `npm run check`.

## Review rule
Do not approve a media-pipeline change merely because mocked FFmpeg returns success. A mock can prove orchestration, not browser codec/runtime compatibility.
