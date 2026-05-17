# ADR 0003: Chat v2 Reducer + Providers + Composition

- Date: 2026-05-16
- Updated: 2026-05-17
- Status: Accepted

## Context

The previous chat controller concentrated too much responsibility:

- UI state and side effects for chat, image, STT, and TTS in a single large hook.
- Deep conditional rendering in message views.
- Composer growth without clear state boundaries.

This increased maintenance cost, re-render risk, and regression probability.

## Decision

Chat v2 uses a domain-driven structure:

1. Central state with `useReducer`

- State slices: `messages`, `request`, `composer`, `audioPlayback`, `recording`, `feedback`.
- Discriminated actions and explicit transitions per slice.

2. Providers by responsibility

- `ChatProvider`: reducer orchestration + side effects (streaming, image, STT, TTS, abort/retry/copy).
- `ChatComposerProvider`: composer-focused state/actions for input and toolbar.

3. Hooks by domain

- Reader/action hooks: `useChatMessages`, `useChatRuntime`, `useChatComposerState`, `useChatAudioActions`.
- Side-effect hooks are grouped under `components/chat/controller-effects`.

4. Composed message rendering

- Explicit variants:
  - `MessageBubble.UserText`
  - `MessageBubble.AssistantText`
  - `MessageBubble.AssistantImage`
  - `MessageBubble.SystemError`
- `ChatBubble.*` remains the base UI infrastructure.

5. DTO/parsing boundaries

- Parsers/guards are centralized in `lib/chat-dtos.ts`.
- `unknown` is restricted to I/O boundaries only.

## Operational policies (2026-05-17 hardening)

1. Composer composition policy

- `ChatComposerForm` is the context consumer/orchestrator.
- Child components follow two levels:
  - layout primitives are presentational only,
  - feature controls receive minimal UI/action props only.
- Passing props to presentational children is valid.
- Anti-pattern: passing whole context objects or redundant global state down the tree.

2. Side-effect injection policy

- Side-effect hooks keep explicit dependency injection (`dispatch`, refs, runtime flags).
- Dependencies may be grouped by typed domain objects (`deps`, `refs`, `request`, etc.) only to reduce signature noise.
- Hidden dependency through extra internal context is not allowed.

3. Barrel policy for chat domain

- Barrels are allowed only for local domain modules:
  - `components/chat/composer/index.ts`
  - `components/chat/chat-controller-reducers/index.ts`
  - `components/chat/controller-effects/index.ts`
- No global catch-all barrel for `components/chat/*`.
- Outside the local domain, prefer specific imports to preserve analyzable paths and avoid broad bundle coupling.

## Consequences

### Positive

- Lower accidental complexity by clearer boundaries.
- Better maintainability for multimodal chat growth.
- Stronger internal contracts for composition and side effects.

### Tradeoffs

- More modules and typed wiring to maintain.
- Requires discipline to keep reducer/actions/effects aligned.

## Related documents

- `README.md`: server-first architecture and chat behavior map.
- `DESIGN.md`: UI and composition visual conventions.
- `AGENTS.md`: quality gates and operational rules.
