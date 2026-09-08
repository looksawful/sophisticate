# Testing and validation

## Automated gate
The repository CI is expected to run on Node 20 and execute:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run check` runs the same local validation sequence after dependencies are installed.

## Test layers

### Pure logic
Keep crop math, bitrate calculations and command-building policy covered by deterministic unit tests.

### Media pipeline
Mock FFmpeg only where necessary. Tests should verify command semantics, cleanup, cancellation, output MIME type and size-limit postconditions. A mocked successful encode is not proof that a real browser encode works.

### UI behavior
Prefer DOM/user-event tests for controls, disabled states, keyboard commands and state transitions. Source-text assertions may remain as temporary characterization tests, but they should not be the primary regression boundary.

### Manual browser smoke test
Before release or after FFmpeg/media changes, validate in a Chromium browser:

| Case | Expected result |
| --- | --- |
| MP4 + audio | preview loads and export is downloadable |
| WEBM | export MIME/container matches WEBM |
| crop enabled | output dimensions match crop |
| crop disabled | full frame is preserved |
| trim | duration reflects selected range |
| 0.5x / 2x speed | video and audio timing remain coherent |
| cancellation | processing stops and a later encode can start |
| size limit | final Blob satisfies the requested limit or the UI reports failure |
| replace file | old object URLs/results are discarded |

## CI troubleshooting
If Pages succeeds while `CI / validate` fails, treat the repository as unhealthy. Deployment success only proves the Pages workflow completed; it does not substitute for lint, typecheck or tests.
