## What changed

Describe the user-visible and technical change.

## Risk surface

- [ ] UI only
- [ ] crop / trim / playback semantics
- [ ] FFmpeg command or runtime lifecycle
- [ ] output size / format / audio behavior
- [ ] deployment / static export

## Validation

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`

For media-pipeline changes:

- [ ] MP4 + audio smoke test
- [ ] WEBM smoke test
- [ ] crop on/off
- [ ] trim boundaries
- [ ] 0.5x / 2x speed if touched
- [ ] cancellation and subsequent retry
- [ ] final Blob size checked when a size limit is enabled

## Evidence

Attach logs, screenshots, test output or a reproducible input where appropriate.
