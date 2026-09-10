# Roadmap

GitHub Issues are the task source of truth. Do not maintain a second copy-paste TODO list in the repository.

## Before the next development stage

1. **Finish audit PR #12 safely.** Its actual scope includes the engineering baseline plus runtime fixes, dependency/framework upgrades, local FFmpeg-core ownership, optional-stage semantics, and hard final-size enforcement. Keep it draft until the Chromium smoke workflow has been recorded.
2. **Merge and verify the baseline.** After #12 is approved, verify both `CI / validate` and GitHub Pages on the resulting `main` SHA before closing the audit/CI/runtime issues.
3. **Finish dependency/tooling triage (#10).** The current audit branch reports zero npm-audit vulnerabilities, but CI also reports that the selected ESLint release is no longer supported. Resolve that deliberately rather than with a forced dependency churn.
4. **Fix unconstrained free crop (#2).** Current `Free` mode still derives a fixed aspect from custom width/height, so this remains a real core crop defect.
5. **Improve regression boundaries (#7).** Replace durable source-text UI assertions with rendered behavioral coverage incrementally.
6. **Narrow the controller facade (#8).** Keep this behavior-preserving and complete it before adding large multi-file state domains.

## Issue status from the audit

- #1: implementation already exists on `main`; close as completed.
- #2: open and reproducible from the current crop-state implementation.
- #3: partially implemented by #12 for crop and size-limit omission; keep open until remaining scope is explicitly re-triaged after merge.
- #4: valid next-stage product work; do not mix it into cleanup/remediation.
- #5: implemented and tested in #12; close only after merge plus runtime smoke.
- #6: implemented in #12 by serving pinned npm-owned FFmpeg core assets; close only after browser/base-path smoke and merge.
- #7: open technical debt.
- #8: open architecture debt.
- #9: audit branch CI is green; close only after the merged `main` SHA is green.
- #10: security findings are remediated on the branch; supported-tooling cleanup remains.
- #11: audit umbrella remains open until #12 is merged or deliberately superseded.

## Next-stage product direction

Multi-video queue / merge work (#4) should start only after the baseline is merged and the controller/test boundaries are stable enough to carry multi-file state. Re-triage #3 alongside that design so global versus per-clip processing options have one coherent contract.
