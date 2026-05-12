# otro-GPT

Aplicación de chat server-first en Next.js 16 con streaming de respuestas, estado de sesión en cookie y UI basada en componentes compuestos.

## Referencias del proyecto

- Estándar visual y de interacción: [DESIGN.md](./DESIGN.md)
- Guía operativa para agentes: [AGENTS.md](./AGENTS.md)
- Skill local de arquitectura para agentes: `.agents/skills/project-architecture/SKILL.md`

## Principios de arquitectura

- Server-first por defecto: `layout`, `page` y estructura principal en Server Components.
- Islas cliente mínimas: solo componentes con estado, eventos o APIs del navegador.
- Separación de responsabilidades:
  - composición y shell en `app/` + componentes server.
  - lógica de chat en hook/controlador cliente.
  - render en componentes UI compuestos reutilizables.

## Mapa de componentes del chat

- Shell de pantalla:
  - `app/page.tsx` compone header, selector de tema y chat.
  - `components/chat/chat-header.tsx` mantiene markup server-side.
- Estado y comportamiento:
  - `components/chat/use-chat-controller.ts` contiene envío, streaming, stop, retry y clear.
  - `components/chat/chat-controller-provider.tsx` expone contexto.
- Render de conversación:
  - `components/chat/chat-messages-view.tsx` gestiona listado y autoscroll.
  - `components/chat/chat-bubble.tsx` define infraestructura compuesta (`Root`, `Header`, `Body`, `Footer`, `Actions`, `Action`).
- Entrada de usuario:
  - `components/chat/chat-composer-form.tsx` usa botón toggle `Send/Stop`.

## Estados y flujo de mensajes

- Modelo UI:
  - `kind`: `message | error`
  - `status`: `complete | streaming | interrupted | error`
  - `role`: `user | assistant | system`
- Flujo:
  - `sendMessage()` agrega user + burbuja assistant `streaming`.
  - `stopGeneration()` aborta la petición activa; conserva parcial como `interrupted`.
  - errores de red/API se renderizan in-stream como burbuja destructiva (`kind=error`).
  - `retryLastFailedPrompt()` reenvía el último prompt fallido.

## Layout y scroll

- Header y composer siempre visibles.
- Solo la zona de mensajes hace scroll (`ScrollArea`).
- La pantalla de chat se ancla al viewport (`h-dvh` + `overflow-hidden` en la página).

## Theming

- Tema gestionado con `next-themes`.
- Configuración:
  - `defaultTheme="system"`
  - `enableSystem`
  - persistencia local con `storageKey="otro-gpt-theme-mode"`.
- Selector de tema en header con opciones `System / Light / Dark`.

## Desarrollo local

```bash
npm run dev
```

## Quality gates obligatorios

```bash
npm run lint
npm run typecheck
npm run format:check
npm run check
```

Notas:

- No usar `next lint` (usar ESLint CLI).
- Si cambias dependencias/config de tooling, ejecutar `npm install` antes de validar.
