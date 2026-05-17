# ADR 0003: Chat v2 con Reducer, Providers y Composición

- Fecha: 2026-05-16
- Actualizado: 2026-05-17
- Estado: Accepted

## Contexto

El controller anterior del chat concentraba demasiada responsabilidad:

- estado UI y side effects de chat, imagen, STT y TTS en un solo hook grande,
- lógica condicional profunda en el render de mensajes,
- crecimiento del composer sin fronteras claras de estado.

Esto aumentaba el costo de mantenimiento, el riesgo de re-renders innecesarios y la probabilidad de regresiones.

## Decisión

Se adopta Chat v2 con arquitectura por dominios:

1. Estado central con `useReducer`

- Slices de estado: `messages`, `request`, `composer`, `audioPlayback`, `recording`, `feedback`.
- Acciones discriminadas y transiciones explícitas por dominio.

2. Providers por responsabilidad

- `ChatProvider`: orquesta reducer y side effects (streaming, imagen, STT, TTS, abort/retry/copy).
- `ChatComposerProvider`: expone estado/acciones del composer para input y toolbar.

3. Hooks por dominio

- Hooks de lectura/acción: `useChatMessages`, `useChatRuntime`, `useChatComposerState`, `useChatAudioActions`.
- Hooks de side effects agrupados en `components/chat/controller-effects`.

4. Render compuesto de mensajes

- Variantes explícitas:
  - `MessageBubble.UserText`
  - `MessageBubble.AssistantText`
  - `MessageBubble.AssistantImage`
  - `MessageBubble.SystemError`
- `ChatBubble.*` se mantiene como infraestructura base de UI.

5. Fronteras DTO/parsing

- Parsers y guards centralizados en `lib/chat-dtos.ts`.
- `unknown` restringido a fronteras de I/O.

## Políticas operativas (hardening 2026-05-17)

1. Política de composición en composer

- Estado actual: `ChatComposerForm` es el consumidor principal del contexto.
- Los hijos se dividen en dos niveles:
  - primitivas de layout (presentacionales),
  - controles funcionales con props mínimas de UI/acción.
- Pasar props a componentes presentacionales es válido.
- Antipatrón: pasar objetos completos de contexto o estado global redundante en cascada.
- Regla de evolución: si el composer sigue creciendo y la coordinación por props se vuelve costosa (más estados/acciones transversales o demasiada orquestación local), se habilita migración parcial o total a consumo directo de `useChatComposer` en controles hijos.

2. Política de inyección de side effects

- Los hooks de side effects mantienen inyección explícita de dependencias (`dispatch`, refs, flags de runtime).
- Se permite agrupar dependencias por objetos tipados (`deps`, `refs`, `request`, etc.) para reducir ruido de firma sin ocultar dependencias.
- No se permite contexto implícito adicional dentro de estos hooks.

3. Política de barrels en el dominio chat

- Barrels permitidos solo para módulos locales del dominio:
  - `components/chat/composer/index.ts`
  - `components/chat/chat-controller-reducers/index.ts`
  - `components/chat/controller-effects/index.ts`
- No se permite barrel global de `components/chat/*`.
- Fuera del dominio local, se prefieren imports específicos para preservar paths analizables y evitar acoplamiento amplio de bundle.

## Consecuencias

### Positivas

- Menor complejidad accidental por fronteras más claras.
- Mejor mantenibilidad para la evolución multimodal del chat.
- Contratos internos más sólidos para composición y side effects.

### Tradeoffs

- Mayor número de módulos y wiring tipado.
- Mayor disciplina para mantener alineados reducer, acciones y side effects.

## Relación con otros documentos

- `README.md`: arquitectura server-first y mapa funcional del chat.
- `DESIGN.md`: estándares visuales y de composición UI.
- `AGENTS.md`: quality gates y políticas operativas del repo.
