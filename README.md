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
  - `app/page.tsx` aplica el gate de sesion y compone header (con `UserMenu`: idioma, tema y logout) y chat.
  - `components/chat/chat-header.tsx` mantiene markup server-side.
  - `components/i18n/language-selector.tsx` es la isla cliente del selector de idioma.
- Estado y comportamiento:
  - `components/chat/chat-controller-reducer.ts` define estado y acciones por dominio.
  - `components/chat/chat-controller-provider.tsx` orquesta side effects y hooks por dominio.
  - `components/chat/chat-composer-provider.tsx` encapsula estado/acciones del composer.
- Render de conversacion:
  - `components/chat/chat-messages-view.tsx` gestiona listado y autoscroll.
  - `components/chat/chat-message-bubbles.tsx` define variantes compuestas por tipo de burbuja.
  - `components/chat/chat-bubble.tsx` define infraestructura compuesta (`Root`, `Header`, `Body`, `Footer`, `Actions`, `Action`).
- Entrada de usuario:
  - `components/chat/chat-composer-form.tsx` usa composición explícita del composer con controles shadcn (select/tooltip/separator).
  - `components/chat/composer/composer-attachments-uploader.tsx` orquesta dropzones y apertura del modal de adjuntos.

## Capacidades multimodales

- Texto (streaming):
  - `POST /api/chat` con `Responses API` y streaming incremental de respuestas.
- Imagen:
  - `POST /api/images` con `Responses API` y streaming incremental de imagenes desde prompt y aspect ratio.
  - emite previews parciales via NDJSON y un evento final con la imagen completa.
  - controlada por roles: solo usuarios con rol `pro` o `admin` ven la opción "Generar imágenes" en
    el menú `+` del composer; los usuarios básicos (`user`) reciben `403 IMAGE_GENERATION_FORBIDDEN`
    si invocan la API directamente. La gestión de roles se realiza desde `/settings/account`.
- Adjuntos de archivos:
  - `POST /api/chat/attachments` para subir archivos del composer.
  - `DELETE /api/chat/attachments/[attachmentId]` para quitar adjuntos activos.
  - adjuntos reutilizables por sesion:
    - imagenes enviadas al modelo como `input_image`,
    - documentos/texto enviados como `input_file`.
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
  - si hay adjuntos marcados `en contexto`, cada prompt de usuario los incluye como contexto de archivo.
  - la gestion de adjuntos vive en "Archivos en contexto" (menu `+`): listar, agregar, incluir/excluir del contexto y eliminar desde modal.
  - modo imagen agrega de inmediato burbuja user (prompt) + burbuja assistant `streaming`.
  - la burbuja assistant de imagen muestra `Skeleton`, luego previews parciales, y finalmente la imagen completa respetando el aspect ratio solicitado.
  - `stopGeneration()` aborta la peticion activa; conserva parcial como `interrupted`.
  - errores de red/API se renderizan in-stream como burbuja destructiva (`kind=error`).
  - `retryLastFailedPrompt()` reenvia el ultimo prompt fallido.
  - acciones en respuestas completas del assistant: `Escuchar` y `Copiar` para texto, `Descargar` para imagen.

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

## Internacionalizacion (i18n)

- Libreria `next-intl` en modo **sin i18n routing** (no cambia la URL).
- Idiomas base: `en` y `es`. Idioma por defecto tomado del sistema (`Accept-Language`).
- Resolucion server-first del locale:
  - `i18n/request.ts` (`getRequestConfig`) carga `messages/{locale}.json`.
  - `i18n/locale.ts#getUserLocale` lee la cookie `NEXT_LOCALE`; si no existe negocia `Accept-Language`
    con `negotiator` + `@formatjs/intl-localematcher` y cae a `defaultLocale`.
  - `i18n/actions.ts#changeLocaleAction` persiste la eleccion en la cookie `NEXT_LOCALE`.
- Render:
  - Server Components: `getTranslations` / `getLocale`.
  - Client Components: `useTranslations` / `useLocale` via `NextIntlClientProvider` (en `app/layout.tsx`).
- `<html lang>` es dinamico segun el locale resuelto.
- Selector de idioma (`components/i18n/language-selector.tsx`): unica isla cliente; cambia la cookie y
  ejecuta `router.refresh()`. En desktop usa boton + menu con el idioma activo visible; en mobile se
  reduce a un boton de icono. Aislado para no re-renderizar el arbol completo.
- LLM: `buildChatInstructions(locale)` agrega una directiva de idioma por defecto (el modelo se adapta
  si el usuario escribe en otro idioma). `POST /api/chat` resuelve el locale con `getUserLocale()`.
- Los mensajes de error de las APIs **no** se localizan (decision de alcance, ver ADR 0005).
- Type-safety de claves: augmentation de next-intl en `global.d.ts`, validada por `npm run typecheck`.
- Agregar un idioma: crear `messages/<locale>.json`, ampliar `locales` en `i18n/config.ts` y el mapeo
  del selector.

## Autenticacion

La autenticacion se delega a `identity-service` (no hay store de usuarios local) con
los paquetes `@cesco_valle/identity-contracts` y `@cesco_valle/identity-auth-sdk`,
bajo un patron **BFF**: el navegador solo habla con las Route Handlers
`app/api/auth/*` de otro-GPT, que llaman a `identity-service` server-side y reenvian
la cookie de sesion (`identity_service_session`) al mismo origen (sin CORS).

- **Variable requerida:** `IDENTITY_URL` (server-only; nunca `NEXT_PUBLIC_*`). URL base
  de identity-service; en dev por defecto `http://localhost:3000`.
- **Login ruteado (SSR):** `/login` (email) deriva a `/login/password` (usuario
  existente) o `/login/register` (nuevo). Formularios cliente en `components/auth/*`
  con react-hook-form + los esquemas zod de `@cesco_valle/identity-contracts`.
- **Gate:** `proxy.ts` **verifica la sesion contra identity-service en cada
  navegacion** (`isSessionValid` → `GET /auth/session`), de modo que una sesion
  revocada por un admin rebota a `/login` en la siguiente navegacion; si falta la
  cookie, redirige sin llamada de red. `app/page.tsx` revalida de forma autoritativa
  (`getCurrentUser`) y las rutas de datos `app/api/{chat,audio,images,...}` exigen
  sesion (`requireSession`, `401`). El cliente compartido vive en
  `lib/identity-client.ts` (sin `server-only`, usable desde el proxy).
- **Logout:** `components/auth/user-menu.tsx` → `POST /api/auth/logout`.

> El chat **requiere** identity-service accesible en `IDENTITY_URL`. Sin sesion valida,
> `/` redirige a `/login`. La suite e2e levanta un mock de identity-service
> (`tests/e2e/support`) para no depender del backend real.

## Desarrollo local

```bash
npm run dev
```

Requiere `IDENTITY_URL` apuntando a una instancia de identity-service
(ver [Autenticacion](#autenticacion)).

## Testing

```bash
npm run test
npm run test:watch
npm run test:e2e
npm run test:e2e:ui
npm run test:all
```

`npm run test` ejecuta Vitest para pruebas unitarias e integracion ligera. `npm run
test:e2e` ejecuta Playwright contra la aplicacion levantada por `webServer`.

## Quality gates obligatorios

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test
npm run check
```

Notas:

- No usar `next lint` (usar ESLint CLI).
- `npm run check` incluye lint, typecheck, format check, Vitest y React Doctor.
- Playwright e2e queda como validacion manual con `npm run test:e2e` o `npm run test:all`.
- Si cambias dependencias/config de tooling, ejecutar `npm install` antes de validar.
