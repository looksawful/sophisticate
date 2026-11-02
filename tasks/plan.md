# Sophisticate — single-video release implementation plan

Date: 2026-11-02. Evidence: `main` `0bcdd80cdd`; [release map #26](https://github.com/looksawful/sophisticate/issues/26), [gate #31](https://github.com/looksawful/sophisticate/issues/31). **Planning only: no product code changed.**

## Scope and decisions

Ship the existing browser-only, statically exported **single-video** editor on the pinned **Node 20** baseline. GitHub Issues are the task source of truth. Do not introduce another task list, runtime CDN, framework, or speculative abstraction.

[Windows/Linux runtime proof #27](https://github.com/looksawful/sophisticate/issues/27) **passed** with real Chrome production smoke on Node 20 (run `35697207020`). The explicit `classWorkerURL` workaround proposed in [PR #24](https://github.com/looksawful/sophisticate/pull/24) failed its smoke; do not merge PR #24 as-is. First reconcile its status with #23 and the #27 evidence. [PR #25](https://github.com/looksawful/sophisticate/pull/25) is an acceptable *partial* input-validation slice, not completion of #15.

## Ordered existing issues and verification

| Order | Existing work | Implementation boundary and acceptance | Verification |
|---|---|---|---|
| 0 | [#23](https://github.com/looksawful/sophisticate/issues/23), PR #24 | Reconcile Windows bug with #27; do not add a failed worker workaround. Preserve documented Node 20 and local worker/core/WASM contract. | Cite successful Windows+Linux Chrome production smoke and close/disposition obsolete patch only after review |
| 1 | [#15](https://github.com/looksawful/sophisticate/issues/15), PR #25 | One validated processing request: finite dimensions/duration; no silent max-size fallback; same picker/drop/paste acceptance; useful inline errors; infeasible size preflight; rejected replacement keeps valid session; documented reset/persistence. | RED→GREEN focused validator and UI tests, then `npm run check`; merge partial PR separately, keep #15 open until full contract |
| 2 | [#16](https://github.com/looksawful/sophisticate/issues/16) + [#19](https://github.com/looksawful/sophisticate/issues/19) | Split only the necessary seam: validated request → pure FFmpeg command planner → per-run session → orchestration emitting structured stages. No copied media algorithm in key regression tests; preserve cleanup, cancellation and final-size guarantee. | Unit tests importing production planner; cancel during init/encode/fallback + retry; production Chrome smoke |
| 3 | [#17](https://github.com/looksawful/sophisticate/issues/17) + [#7](https://github.com/looksawful/sophisticate/issues/7) | Separate small accessibility PRs: (a) accessible names for Dropzone input **and expanded log filter/search**; (b) trim endpoints keyboard multi-thumb sliders (Arrow 0.1s, Shift+Arrow 1s) preserving #13; (c) no global Enter/Esc collision with focused controls; (d) one concise status/errors region; (e) static reduced-motion WebGL and visibility pause; (f) tooltip semantics. | Rendered role/name/keyboard tests, axe in empty/loaded/log-expanded/processing states, keyboard, NVDA/VoiceOver, 320px reflow |
| 4 | [#2](https://github.com/looksawful/sophisticate/issues/2) + [#3](https://github.com/looksawful/sophisticate/issues/3) | True unconstrained Free Crop, distinct from Custom W:H; truthful processing options; preview looping distinct from export repetition. Preserve existing presets. | Tests for free crop geometry and effective FFmpeg arguments, browser crop/preview/export smoke |
| 5 | [#31](https://github.com/looksawful/sophisticate/issues/31) | Gate only after all release blockers are resolved: green exact-head CI + Pages, real Linux and Windows Chrome MP4/WEBM export, cancel at init/active + retry, final-size guarantee, release a11y, validated requests and structured stages. | `npm ci && npm run check`, Chrome production route under `/sophisticate/` and same-origin JS/WASM requests, manual accessibility checks, no unresolved release blocker |

Parallelism: accessible input names and WebGL reduced-motion can start independently. Status UI waits on #16 structured stages; processing UI validation waits on #15. Trim keyboard integration must reuse #13's existing range normalization. Finish each vertical slice with tests and review before the next shared-state change.

## Risks and boundaries

- **False confidence:** static build/Pages success does not establish WASM codec runtime; the real browser export is mandatory.
- **False a11y pass:** initial axe reported **1 confirmed critical violation** (unlabeled Dropzone file input); it did not exercise expanded log fields, loaded trim controls, or processing states. Never report contrast/bypass review flags as confirmed failures.
- **Behavior regression:** avoid broad rewrite of the 496-line controller or FFmpeg processing module merely for formatting. [#8](https://github.com/looksawful/sophisticate/issues/8) narrowing is opportunistic, not a separate release precondition absent a demonstrated blocker.
- **Deferred:** multi-video/batch/merge [#4](https://github.com/looksawful/sophisticate/issues/4), repository-wide strict TypeScript [#18](https://github.com/looksawful/sophisticate/issues/18), broad toolchain modernization [#10](https://github.com/looksawful/sophisticate/issues/10).

## Primary guidance

- [W3C multi-thumb slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/) and [single-slider keys](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- [WCAG 4.1.3 status messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages)
- [W3C prefers-reduced-motion technique](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
- [Accessibility review #17](https://github.com/looksawful/sophisticate/issues/17#issuecomment-6573556082)
