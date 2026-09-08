# Sophisticate Repository Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a reproducible green baseline and fix verified reliability, runtime, test, architecture and dependency defects without mixing in roadmap feature work.

**Architecture:** Keep the current Next.js/React client and browser FFmpeg pipeline. Fix problems at explicit boundaries: clean-runner setup, export postconditions, runtime asset ownership, controller dependencies, and test seams. Use small pure helpers where behavior can be proven without a browser/WASM runtime.

**Tech Stack:** Next.js 14, React 18, TypeScript 5.5, Vitest 4, @ffmpeg/ffmpeg 0.12.x, react-easy-crop, GitHub Actions.

**Spec:** `docs/ARCHITECTURE.md`, `docs/TESTING.md`, issues #5-#11.

## Global Constraints
- Do not implement roadmap issue #4 during defect remediation.
- RED -> GREEN -> REFACTOR for bug fixes.
- Merge gate: `npm ci`, lint, typecheck, tests, production build.
- Do not claim browser FFmpeg behavior from Node-only tests.
- No blind `npm audit fix --force`.

---

### Task 1: Reproducible clean-runner validation
**Files:** `.github/workflows/ci.yml`, `scripts/generate-test-fixtures.mjs`, `package.json`, `docs/TESTING.md`

- [ ] Reproduce missing-fixture failures from `src/lib/integration.test.ts`.
- [ ] Generate `test-320x240-3s.mp4` and `test-640x480-2s-noaudio.mp4` deterministically with FFmpeg lavfi inputs.
- [ ] Install FFmpeg CLI explicitly in CI before tests:
```yaml
- name: Install FFmpeg test dependency
  run: sudo apt-get update && sudo apt-get install -y ffmpeg
```
- [ ] Run fresh CI. Expected: fixture generation succeeds, 198/198 tests pass, build executes.

### Task 2: Enforce output-size postcondition (#5)
**Files:** create `src/lib/outputSizePolicy.ts`, create `src/lib/outputSizePolicy.test.ts`, modify `src/lib/processVideo.ts`

- [ ] RED tests:
```ts
expect(isWithinOutputLimit(500_000, 500_000)).toBe(true);
expect(isWithinOutputLimit(510_000, 500_000, 0)).toBe(false);
expect(nextVideoBitrate(1000, 600_000, 500_000)).toBeLessThan(1000);
```
- [ ] Verify RED because the module is absent.
- [ ] Implement byte-based `isWithinOutputLimit` and `nextVideoBitrate` helpers.
- [ ] Integrate at most two adaptive bitrate fallback encodes. Re-read output after every pass.
- [ ] If final output remains above `maxBytes`, throw an explicit error containing actual and target sizes instead of returning the Blob.
- [ ] Run focused tests, processVideo tests, then full suite.

### Task 3: Own FFmpeg WASM runtime (#6)
**Files:** `package.json`, `package-lock.json`, `src/lib/processVideo.ts`, deployment config/docs

- [ ] RED guard proving `processVideo.ts` still contains `unpkg.com`.
- [ ] Pin a compatible exact `@ffmpeg/core` version.
- [ ] Serve reviewed core JS/WASM from same-origin project assets under the GitHub Pages base path.
- [ ] Change `getFFmpeg()` to same-origin URLs; remove runtime CDN dependency.
- [ ] Verify unit tests, build/export, then browser smoke before closing #6.

### Task 4: Improve test seams and controller stability (#7, #8)
**Files:** `ui-audit.test.ts`, `useSophisticateController.ts`, hook files, focused tests/helpers

- [ ] Inventory source-text assertions; keep only static/supply-chain invariants.
- [ ] Add behavior tests for disabled predicates, progress state, stable log IDs and speed choices using pure helpers/view-model functions where DOM infrastructure is absent.
- [ ] Remove redundant regex/string assertions only after behavior coverage exists.
- [ ] Reproduce the three `react-hooks/exhaustive-deps` warnings.
- [ ] Destructure actual stable hook functions/state before callbacks/effects and remove unnecessary lint suppressions.
- [ ] Extract processing orchestration to a focused hook only if required to get clear dependency ownership while preserving `SophisticateController` shape.
- [ ] Verify lint has zero hook-dependency warnings, then typecheck/tests/build.

### Task 5: Dependency/security remediation (#10)
**Files:** `package.json`, `package-lock.json`, CI/docs as needed

- [ ] Capture exact `npm audit --json` evidence on a clean runner.
- [ ] Classify direct/transitive and prod/dev findings.
- [ ] Upgrade direct vulnerable packages with supported patch/minor changes first.
- [ ] Align `@types/node` with Vitest/Vite's supported Node 20 range.
- [ ] Verify `npm ci`, lint, typecheck, tests, build after each dependency slice.
- [ ] Re-run audit and record any residual accepted risk by package and reason.

### Task 6: Reconcile stale issues and docs
**Files:** GitHub issues #1-#3, #5-#11, README/docs, Notion `Sophisticate`

- [ ] Close #1 only after a passing test proves `3:4` exists.
- [ ] Do not close #2 unless `Free` genuinely supports free crop semantics; current custom fixed ratio does not qualify.
- [ ] Re-evaluate #3 against its acceptance criteria, not control labels.
- [ ] Close remediation issues only with fixing commit/PR and fresh validation evidence.
- [ ] Update Notion with final architecture, tests, resolved issues, residual risks, and deferred roadmap #4.
- [ ] Final gate: fresh CI must show install, lint, typecheck, all tests, build. Browser smoke required for full FFmpeg runtime verification.
