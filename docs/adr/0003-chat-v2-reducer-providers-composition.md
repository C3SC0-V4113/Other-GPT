# ADR 0003: Chat v2 Reducer + Providers + Composición

- Date: 2026-05-16
- Status: Accepted

## Context

El controller previo del chat concentraba demasiada responsabilidad:

- estado UI y side effects de chat, imagen, STT y TTS en un solo hook grande,
- lógica condicional extensa en el render de mensajes,
- crecimiento del composer sin una frontera de estado propia.

Esto incrementaba costo de mantenimiento, riesgo de regresiones y re-renders innecesarios.

## Decision

Se adopta Chat v2 con arquitectura por dominios:

1. Estado central con `useReducer`

- Estado segmentado en slices: `messages`, `request`, `composer`, `audioPlayback`, `recording`, `feedback`.
- Acciones discriminadas y transiciones explícitas por dominio.

2. Providers por responsabilidad

- `ChatProvider`: orquesta reducer y side effects (streaming, imagen, STT, TTS, abort/retry/copy).
- `ChatComposerProvider`: expone estado/acciones del composer para aislar input + toolbar de otras vistas.

3. Hooks de lectura/acción por dominio

- `useChatMessages`
- `useChatRuntime`
- `useChatComposerState`
- `useChatAudioActions`

4. Render compuesto de mensajes

- Variantes explícitas:
  - `MessageBubble.UserText`
  - `MessageBubble.AssistantText`
  - `MessageBubble.AssistantImage`
  - `MessageBubble.SystemError`
- Se mantiene `ChatBubble.*` como infraestructura base.

5. Contratos DTO y parsers compartidos

- Se centralizan parsers/guards en `lib/chat-dtos.ts`.
- `unknown` queda restringido a fronteras I/O (request/response parsing).

## Consequences

### Positivas

- Menor complejidad accidental por separación de responsabilidades.
- Mejor legibilidad para evolución de funcionalidades multimodales.
- Menor acoplamiento entre composer y render de mensajes.
- Tipado más robusto en borde de API.

### Tradeoffs

- Más módulos y contratos internos que coordinar.
- Mayor disciplina para mantener acciones/reducer alineados con side effects.

## Relación con otros documentos

- `README.md`: arquitectura server-first y mapa funcional del chat.
- `DESIGN.md`: patrón compuesto de burbujas y consistencia visual.
- `AGENTS.md`: quality gates y políticas operativas.
