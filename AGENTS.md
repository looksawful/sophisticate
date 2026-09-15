# Agent instructions

## Start and routing

- Before editing, inspect the current branch, HEAD, relevant diff, and the files that actually own the behavior. Preserve unrelated work.
- Treat `package.json`, configuration, executable code, tests, and workflows as stronger evidence than remembered documentation.
- Repository-local skills are guidance, not permission to merge, deploy, publish, or weaken validation.

## Skill routing

- Changes to `src/lib/processVideo.ts`, FFmpeg arguments/runtime lifecycle, crop/trim/speed/fps/audio transforms, cancellation, or output-size behavior: read `.agents/skills/media-pipeline-audit/SKILL.md`.
- Release validation, GitHub Pages, runtime asset loading, or browser-visible media behavior: read `.agents/skills/browser-release-smoke/SKILL.md`.

## Project boundaries

- Keep Sophisticate browser-only and statically exportable unless a product decision explicitly changes that architecture.
- Preserve crop, trim, playback, speed, audio, output-format, cancellation, and size-limit semantics during refactors.
- When crop or size limiting is disabled, the corresponding FFmpeg stage must actually be omitted rather than replaced with a hidden equivalent constraint.
- A configured size limit is a final-artifact contract: success requires the final encoded Blob to satisfy it or processing must fail explicitly.
- FFmpeg core assets are copied from the pinned npm dependency into `public/ffmpeg-core/`; do not silently reintroduce a third-party runtime CDN.
- Revoke created object URLs and clean FFmpeg listeners/temp files on success, failure, cancellation, replacement, and unmount where applicable.
- Keep the GitHub Pages `basePath` / `assetPrefix` contract valid.
- `AGENTS.md`, `.agents/skills/**`, `.github/workflows/**`, package scripts, and validation configuration are protected tooling surfaces. Keep edits narrow and reviewable.

## Validation

- Install from the lockfile with `npm ci`.
- Run `npm run check` before merge. FFmpeg CLI is required locally because `pretest` generates deterministic integration fixtures.
- Media/runtime/framework changes also require the Chromium smoke workflow; mocked FFmpeg tests do not prove browser codec/runtime compatibility.
- If a required check cannot be run, record exactly which check and why. Do not substitute deployment success for validation.

## Git and external actions

- Avoid destructive history operations and force pushes as cleanup shortcuts.
- Do not merge or deploy merely because CI is green; review the actual diff, runtime risk, and required browser evidence first.
