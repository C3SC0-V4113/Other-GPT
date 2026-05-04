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
4. Run `npm run check` as final gate before reporting completion.

### Next.js linting rule

- Do not use `next lint`.
- Use ESLint CLI only (`npm run lint` / `npm run lint:fix`) because this project is on Next.js 16.

### Scope and exceptions

- If only documentation files were changed, at minimum run `npm run format:check`.
- If dependencies or lint/tooling config changed, run `npm install` before validation.
- If any required command cannot run, report:
  - the exact command,
  - the exact error,
  - what remains unverified.

### Completion criteria

- Do not claim the task is done unless all required checks pass, or failures are explicitly reported with blockers.
