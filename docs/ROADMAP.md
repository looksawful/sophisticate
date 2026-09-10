# Roadmap

GitHub Issues are the task source of truth. This file defines execution order and phase exit conditions; it should not duplicate full Issue bodies.

## Phase A — finish PR #12 safely

Current blocker: the audit/remediation branch passes canonical CI, but the real Chromium FFmpeg WASM smoke is not green.

Work:

- Resolve or explicitly disposition the Chromium smoke failure.
- Review the Next/React/tooling upgrades in PR #12 as runtime changes, not cleanup-only changes.
- Keep only browser-smoke workflow code that is maintainable after the audit.
- Run canonical CI on the exact final PR HEAD.
- Merge only after browser/runtime risk is resolved or explicitly accepted.
- Verify both CI and GitHub Pages on the resulting `main` SHA.

Exit condition: merged `main` has the intended runtime fixes, green canonical CI, successful Pages deployment, and an explicit browser-runtime disposition.

Close candidates after evidence: #5, #6, #9. Keep #11 open until repository, Issues, and Notion status agree.

## Phase B — correctness before refactoring

1. #13 — normalize trim boundaries, including tiny clips and handle crossing.
2. #14 — give every processing run cancellation/session identity, including FFmpeg initialization.
3. #15 — create one validated processing request and define file-replacement/reset persistence.

Exit condition: boundary, cancellation, and validation behavior has regression coverage; silent fallback values are no longer the primary input contract.

## Phase C — media architecture and test seam

1. #16 — separate deterministic command planning, FFmpeg session lifecycle, and orchestration; report processing stages explicitly.
2. #19 — remove copied private media algorithms from tests and exercise production planning/normalization code instead.

Exit condition: media planning is directly testable, runtime/session ownership is explicit, and the UI receives real processing-stage information instead of inferring it from progress percentages.

## Phase D — application state, UI, and accessibility

1. #8 — narrow controller/view models without changing behavior.
2. #7 — replace critical source-text UI assertions with rendered user-event tests.
3. #17 — add programmatic labels/states, keyboard timeline behavior, tooltip/status semantics, and reduced-motion coverage.
4. #2 — implement true unconstrained Free crop with explicit crop-mode semantics.
5. #3 — finish processing-option taxonomy, persistence, and copy after #15/#16 define the underlying behavior.

Exit condition: child views consume narrow coherent state/actions, critical interactions have behavioral tests, pointer-only trim has keyboard parity, and crop/processing labels match actual semantics.

## Phase E — type and toolchain hardening

1. #18 — migrate to strict TypeScript in controlled domain slices.
2. #10 — isolate and verify dependency, runtime, compiler, Node, and lint-tool migrations.

Exit condition: strictness/toolchain changes are reviewable migrations rather than one mixed dependency churn.

## Phase F — multi-video product work

#4 starts only after single-file processing/session/controller ownership is stable.

Target model:

`Session → Clip → Effective Request → Job → Engine Scheduler`

Start with serialized processing. Concurrency should be a separate product/engineering decision with explicit browser-runtime evidence.
