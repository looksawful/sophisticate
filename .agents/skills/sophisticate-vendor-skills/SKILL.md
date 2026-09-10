---
name: sophisticate-vendor-skills
description: Route Sophisticate frontend work to version-aware React, Next.js, TypeScript, accessibility and design Agent Skills without forcing framework migrations.
---

# Curated external skills for Sophisticate

The checked-in project versions are authoritative: Next.js 14.2.x, React 18.3.x, TypeScript 5.5.x, Tailwind CSS 3.4.x and `framer-motion` 12.x. External skills must adapt to those versions instead of silently upgrading the application to newer framework assumptions.

## Approved

- `vercel-labs/agent-skills`: `react-best-practices`. Use for React/Next performance review, waterfalls, bundle size, server/client boundaries, data fetching, rerenders and rendering efficiency. Apply only rules compatible with the project's actual React/Next versions.
- `millionco/react-doctor`: React Doctor / React health audit. Use as a verification and issue-finding layer for correctness, performance, accessibility, architecture and bundle problems. A score is diagnostic evidence, not permission for broad rewrites.
- `cursor/plugins`: `typescript-best-practices`. Use for type-safety and maintainable TypeScript without unrelated migrations.
- `addyosmani/agent-skills`: `accessibility-checklist`. Use for upload controls, crop interactions, focus, keyboard flow, progress/cancel states and exported-result UI.

## Reference only

- `anthropics/claude-code`: `frontend-design`. Use for deliberate visual direction and design critique. Preserve the product's existing interaction model and do not rewrite functionality for aesthetics.
- Animation guidance may be used for `framer-motion` 12.x as installed. Do not replace imports/APIs with a different Motion package or perform a dependency migration unless that migration is the explicit task.

## Product-specific guardrails

Sophisticate processes video in the browser with ffmpeg.wasm. For changes touching encoding, cancellation, file loading or previews, review memory use, worker lifecycle, cleanup and failure states in addition to React rendering performance.

Do not move browser-only media operations to a server merely because a generic Next.js skill prefers server work. Do not load large media assets twice to satisfy a component pattern.

## Excluded

- React 19-only, Next.js 15/16-only and Tailwind 4-only rules unless the task explicitly upgrades the corresponding dependency and proves the migration.
- Whole-pack ECC, Superpowers, wshobson or UI mega-pack installs.
- GSAP and Three.js skills: not part of the current application stack.

## Verification

After a relevant change, run the existing project checks appropriate to the diff, including `npm test` and `npm run build`; run lint where the project's current Next.js toolchain supports the configured command. For media/runtime interaction changes, add browser-level/manual evidence rather than treating unit tests as proof of ffmpeg.wasm lifecycle correctness.

Install/copy only named external skills at project scope after reviewing contents/license and recording the upstream revision. Never use a whole-pack `--all` install in this repository.
