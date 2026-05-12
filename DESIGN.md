# DESIGN.md

Este documento define el estándar oficial de diseño UI/UX para `otro-GPT`.

Si hay conflicto entre implementación visual y este documento, **`DESIGN.md` tiene precedencia para decisiones de UI**.  
`README.md` resume la arquitectura y enlaza este estándar.

## 1) Principios de diseño

- Claridad primero: cada estado del chat debe ser evidente.
- Jerarquía visual: contenido principal > estado > acciones.
- Feedback inmediato: cualquier acción debe reflejar estado rápido (streaming, error, interrupted).
- Consistencia: mismo patrón visual y de interacción para componentes equivalentes.

## 2) Sistema visual

- Usar tokens semánticos existentes (`background`, `foreground`, `muted`, `destructive`, etc.).
- No usar colores hardcoded para estados de negocio.
- Respetar radios y spacing del sistema actual (base shadcn + Tailwind semántico).
- Tipografía:
  - contenido de conversación legible y uniforme.
  - estados/metadata en tamaño menor.

## 3) Patrones de layout

- Shell de chat:
  - header fijo en flujo normal.
  - composer fijo en flujo normal.
  - mensajes en zona scrollable única.
- Anclaje de pantalla:
  - viewport de chat controlado (`h-dvh` + `overflow-hidden`).
- Contenido:
  - ancho máximo centrado (`max-w-4xl`) para legibilidad.

## 4) Patrones de componentes

- Usar infraestructura compuesta de burbujas (`ChatBubble.*`) para conversación.
- No renderizar lógica de estado con texto inline suelto fuera del patrón compuesto.
- Estados visuales por rol/estado:
  - `user`, `assistant`, `system`.
  - `complete`, `streaming`, `interrupted`, `error`.
- Errores:
  - se muestran in-stream como burbuja `destructive`.
  - acciones (`Reintentar`) viven en footer de burbuja.

## 5) Estados y feedback

- `streaming`: indicar “Generando...” en footer de burbuja assistant.
- `interrupted`: conservar contenido parcial y mostrar `Reintentar`.
- `error`: burbuja destructiva con mensaje y acción `Reintentar`.
- `empty`: estado inicial claro cuando no hay conversación.

## 6) Theming

- Estrategia oficial:
  - `System / Light / Dark`.
  - `system` por defecto.
  - persistencia local de preferencia.
- Selector de tema en header.
- El diseño debe mantener contraste suficiente en ambos modos.

## 7) Accesibilidad

- Focus visible en elementos interactivos.
- Navegación por teclado funcional para acciones principales.
- Etiquetas y textos de acción explícitos.
- Objetivos táctiles adecuados en controles de header y composer.

## 8) Motion e interacción

- Transiciones sutiles; evitar animación distractora.
- Cambios de estado deben sentirse rápidos y comprensibles.
- No introducir motion compleja sin necesidad funcional.

## 9) Do / Don’t

Do:

- Usar tokens semánticos y variantes existentes.
- Mantener patrón compuesto para burbujas y acciones.
- Mantener server-first con islas cliente mínimas para interactividad.

Don’t:

- Reintroducir banner de error global separado del stream de chat.
- Romper la regla de scroll único de mensajes.
- Acoplar lógica de estado compleja directamente en markup inline repetido.
