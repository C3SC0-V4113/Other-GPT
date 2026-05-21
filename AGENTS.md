<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Agent Quality Gates (Minimum Required)

These checks are mandatory for any agent making code or config changes in this repository.

### Required local validation before final response

1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run format:check`.
4. Run `npm run doctor`.
5. Run `npm run check` as final gate before reporting completion.

### Next.js linting rule

- Do not use `next lint`.
- Use ESLint CLI only (`npm run lint` / `npm run lint:fix`) because this project is on Next.js 16.

### Scope and exceptions

- If only documentation files were changed, at minimum run `npm run format:check`.
- If dependencies or lint/tooling config changed, run `npm install` before validation.
- `npm run check` includes `npm run doctor:ci`; React Doctor warnings are blocking (`--fail-on warning`).
- If any required command cannot run, report:
  - the exact command,
  - the exact error,
  - what remains unverified.

### Hooks and CI enforcement

- `pre-commit` runs `npx lint-staged` and `npm run doctor:staged` for fast local feedback.
- `pre-push` runs `npm run check` as the full blocking gate.
- CI (`.github/workflows/quality.yml`) runs `npm run check`, so React Doctor policy is enforced in pull requests and pushes.

### Completion criteria

- Do not claim the task is done unless all required checks pass, or failures are explicitly reported with blockers.

## Project References

- Architecture summary and implementation contracts: `README.md`
- UI/UX standard and visual rules (source of truth for design): `DESIGN.md`
- Agent architecture guardrails: `.agents/skills/project-architecture/SKILL.md`
- ADR index and architecture decisions: `docs/adr/README.md`
- Decision documentation sync skill: `.agents/skills/decision-doc-sync/SKILL.md`

## Skill Invocation Checklist

Use this checklist to decide **when** to invoke each skill.  
Reference hierarchy for conflicts:

1. `DESIGN.md` for UI/UX rules.
2. `README.md` for architecture/contracts.
3. `AGENTS.md` for operational workflow.

### Trigger map

- `project-architecture`
  - Trigger on any change to chat UI, component architecture, layout/scroll behavior, state flow, or theming.
- `systematic-debugging`
  - Trigger on bugs, failing checks, unexpected behavior, build/test/lint/typecheck/doctor failures before proposing fixes.
- `vercel-composition-patterns`
  - Trigger on compound components, composable APIs, provider patterns, or refactors to reduce prop complexity.
- `vercel-react-best-practices`
  - Trigger on React/Next performance concerns (re-renders, bundle size, component structure, rendering patterns).
- `typescript-advanced-types`
  - Trigger on advanced typing for custom hooks, reducers/actions, discriminated unions, context values/providers, and generic utilities.
- `next-best-practices`
  - Trigger on Next.js 16 conventions: RSC boundaries, route handlers, file conventions, data fetching and runtime usage.
- `shadcn`
  - Trigger on UI component work using shadcn patterns, composition, styling rules, registries, or CLI-driven component updates.
- `decision-doc-sync`
  - Trigger when there are structural decisions (architecture, contracts, cross-cutting UX standards, conventions).
- `architecture-decision-records`
  - Trigger when creating, updating, superseding, or reviewing ADRs for significant technical decisions.
- `verification-before-completion`
  - Trigger before claiming work is complete, fixed, or passing; use as the evidence policy before project validation.
- `project-min-evaluation`
  - Trigger at implementation close before declaring completion; remains source of truth for exact project commands.

### Recommended invocation order

- New UI feature
  - `project-architecture` -> `vercel-composition-patterns` -> `vercel-react-best-practices` -> `next-best-practices` -> `project-min-evaluation`
- State refactor (hooks/reducer/context/provider)
  - `project-architecture` -> `typescript-advanced-types` -> `vercel-composition-patterns` -> `project-min-evaluation`
- Large structural change
  - Apply the relevant flow above, then invoke `decision-doc-sync`; use `architecture-decision-records` if an ADR is needed.
- Debugging or failing validation
  - `systematic-debugging` -> relevant domain skill -> `verification-before-completion` -> `project-min-evaluation`
- Completion verification
  - `verification-before-completion` -> `project-min-evaluation`

### Documentation sync guardrail

- Keep `CLAUDE.md` as pointer to `AGENTS.md` (no duplicated policy blocks).
- Do not copy UI rules from `DESIGN.md` into `AGENTS.md`; link instead.
- Do not copy architecture contracts from `README.md` into `AGENTS.md`; link instead.
