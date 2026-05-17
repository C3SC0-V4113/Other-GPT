# otro-GPT

Aplicacion de chat server-first en Next.js 16 con streaming de respuestas, estado de sesion en cookie y UI basada en componentes compuestos.

## Referencias del proyecto

- Estandar visual y de interaccion: [DESIGN.md](./DESIGN.md)
- Guia operativa para agentes: [AGENTS.md](./AGENTS.md)
- Skill local de arquitectura para agentes: `.agents/skills/project-architecture/SKILL.md`
- ADRs de arquitectura: [docs/adr/README.md](./docs/adr/README.md)

## Principios de arquitectura

- Server-first por defecto: `layout`, `page` y estructura principal en Server Components.
- Islas cliente minimas: solo componentes con estado, eventos o APIs del navegador.
- Separacion de responsabilidades:
  - composicion y shell en `app/` + componentes server.
  - logica de chat en hook/controlador cliente.
  - render en componentes UI compuestos reutilizables.

## Mapa de componentes del chat

- Shell de pantalla:
  - `app/page.tsx` compone header, selector de tema y chat.
  - `components/chat/chat-header.tsx` mantiene markup server-side.
- Estado y comportamiento:
  - `components/chat/chat-controller-reducer.ts` define estado y acciones por dominio.
  - `components/chat/chat-controller-provider.tsx` orquesta side effects y hooks por dominio.
  - `components/chat/chat-composer-provider.tsx` encapsula estado/acciones del composer.
- Render de conversacion:
  - `components/chat/chat-messages-view.tsx` gestiona listado y autoscroll.
  - `components/chat/chat-message-bubbles.tsx` define variantes compuestas por tipo de burbuja.
  - `components/chat/chat-bubble.tsx` define infraestructura compuesta (`Root`, `Header`, `Body`, `Footer`, `Actions`, `Action`).
- Entrada de usuario:
  - `components/chat/chat-composer-form.tsx` usa composición explícita del composer con controles shadcn (badge/select/tooltip/separator).

## Capacidades multimodales

- Texto (streaming):
  - `POST /api/chat` con streaming incremental de respuestas.
- Imagen:
  - `POST /api/images` para generar imagenes desde prompt y aspect ratio.
- Speech-to-text:
  - `POST /api/audio/transcriptions` para transcribir audio del dictado.
- Text-to-speech:
  - `POST /api/audio/speech` para escuchar respuestas del assistant.

## Estados y flujo de mensajes

- Modelo UI:
  - `kind`: `message | error`
  - `status`: `complete | streaming | interrupted | error`
  - `role`: `user | assistant | system`
  - `content.type`: `text | image`
- Flujo:
  - `sendMessage()` agrega user + burbuja assistant `streaming`.
  - modo imagen genera burbuja user (prompt) + burbuja assistant (imagen).
  - `stopGeneration()` aborta la peticion activa; conserva parcial como `interrupted`.
  - errores de red/API se renderizan in-stream como burbuja destructiva (`kind=error`).
  - `retryLastFailedPrompt()` reenvia el ultimo prompt fallido.
  - acciones en respuestas completas del assistant: `Escuchar` y `Copiar`.

## Layout y scroll

- Header y composer siempre visibles.
- Solo la zona de mensajes hace scroll (`ScrollArea`).
- La pantalla de chat se ancla al viewport (`h-dvh` + `overflow-hidden` en la pagina).

## Theming

- Tema gestionado con `next-themes`.
- Configuracion:
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
