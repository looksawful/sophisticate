---
name: media-pipeline-audit
description: Use when changing or reviewing FFmpeg processing, media options, cancellation, cleanup, output formats, or size-limit behavior in Sophisticate.
---

# Media pipeline audit

Use this workflow for changes to `src/lib/processVideo.ts` or any UI/controller change that alters `ProcessOptions`.

## Trace the contract

1. Trace the user-visible setting to the exact `ProcessOptions` value.
2. Trace that value into the emitted FFmpeg arguments.
3. Verify disabled stages are omitted rather than replaced by hidden constraints.
4. Verify duration math after trim, loop, and speed changes.
5. Verify audio filters stay valid for supported speed values.
6. Verify listeners and temporary virtual-FS files are removed on success, error, and cancellation.
7. Verify a cancelled FFmpeg instance is not reused.
8. For size-limited output, inspect the final Blob size. Intermediate-pass estimates are not proof.

## Required evidence

- Deterministic unit tests for pure math and option semantics.
- Focused media-pipeline tests for the changed orchestration path.
- `npm run check`.
- Chromium smoke evidence when FFmpeg runtime behavior, codecs, asset loading, or output semantics can change.

## Completion rule

Do not report a media-pipeline change as production-safe solely because mocked FFmpeg returned success. Record the exact automated checks and the browser scenario used, or explicitly state that browser verification is still outstanding.
