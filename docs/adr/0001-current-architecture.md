# ADR 0001: Current Architecture

- Date: 2026-05-12
- Status: Accepted

## Context

El proyecto evoluciono de una base Next.js generica a una app de chat con:

- enfoque server-first,
- streaming de respuestas,
- layout con header y composer siempre visibles,
- sistema de tema `System/Light/Dark`,
- estandar visual basado en componentes compuestos.

Se necesitaba consolidar una arquitectura coherente para minimizar JS cliente y mantener una UX consistente.

## Decision

Se adopta la siguiente arquitectura base:

1. Server-first por defecto

- `app/layout.tsx`, `app/page.tsx` y `components/chat/chat-header.tsx` permanecen server-side.
- Componentes cliente solo para interactividad real (chat controller, selector de tema, acciones de UI).

2. Chat state y flujo en controlador dedicado

- `use-chat-controller.ts` centraliza envio, streaming, stop, retry y limpieza.
- Modelo UI de mensajes:
  - `kind`: `message | error`
  - `status`: `complete | streaming | interrupted | error`
  - `role`: `user | assistant | system`

3. Render con infraestructura compuesta

- `ChatBubble.*` como patron obligatorio para mensajes, estados y acciones.
- Errores in-stream como burbuja destructiva, sin banner global separado.

4. Layout de scroll controlado

- Pantalla anclada al viewport (`h-dvh` + `overflow-hidden`).
- Solo la zona de mensajes hace scroll.

5. Theming estandarizado

- `next-themes` con `defaultTheme=\"system\"`, `enableSystem` y persistencia local.
- Selector `System/Light/Dark` en header.

## Consequences

### Positivas

- Menor superficie cliente y mejor alineacion con server-first.
- Flujo de mensajes mas mantenible y predecible.
- Consistencia visual y de estados en toda la conversacion.
- Decisiones de tema y layout claras para futuras iteraciones.

### Tradeoffs

- Mayor disciplina para no mover logica innecesaria a cliente.
- Cualquier cambio estructural en UI/chat ahora requiere actualizar documentacion de gobernanza (`README`, `DESIGN`, ADRs).

### Riesgos a vigilar

- Reintroduccion accidental de errores fuera del stream.
- Ruptura de la regla de scroll unico de mensajes.
- Desalineacion entre implementacion y estandar de diseño.

## Relacion con otros documentos

- `README.md`: resumen operativo de arquitectura y contratos.
- `DESIGN.md`: fuente de verdad para decisiones de UI/UX.
- `AGENTS.md`: reglas operativas de agentes y referencias.
