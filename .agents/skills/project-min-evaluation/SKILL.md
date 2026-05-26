---
name: project-min-evaluation
description: Run minimum local quality checks for this repository before marking work complete.
---

# Project Minimum Evaluation

Use this skill before declaring implementation tasks complete.

## Required checks

1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run format:check`.
4. Run `npm run test`.
5. Run `npm run doctor`.
6. Run `npm run check` as the final gate.

## Project constraints

- Use ESLint CLI only (`npm run lint`, `npm run lint:fix`).
- Do not use `next lint` (Next.js 16 project).
- `npm run check` includes `npm run test` and `npm run doctor:ci`.
- React Doctor warnings are blocking because `doctor:ci` runs with `--fail-on warning`.

## Conditional rules

- If only docs changed, run at least `npm run format:check`.
- If dependency or tooling config changed, run `npm install` before checks.

## Failure reporting

If a check cannot be executed or fails, report:

- exact command,
- exact error,
- unverified scope.

## Completion policy

Only report completion when all required checks pass, or when blockers are clearly documented.
