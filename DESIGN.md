# DESIGN.md

Este documento define el estandar oficial de diseno UI/UX para `otro-GPT`.

Si hay conflicto entre implementacion visual y este documento, **`DESIGN.md` tiene precedencia para decisiones de UI**.
`README.md` resume la arquitectura y enlaza este estandar.

## 1) Principios de diseno

- Claridad primero: cada estado del chat debe ser evidente.
- Jerarquia visual: contenido principal > estado > acciones.
- Feedback inmediato: cualquier accion debe reflejar estado rapido (streaming, error, interrupted).
- Consistencia: mismo patron visual y de interaccion para componentes equivalentes.

## 2) Sistema visual

- Usar tokens semanticos existentes (`background`, `foreground`, `muted`, `destructive`, etc.).
- No usar colores hardcoded para estados de negocio.
- Respetar radios y spacing del sistema actual (base shadcn + Tailwind semantico).
- Tipografia:
  - contenido de conversacion legible y uniforme.
  - estados/metadata en tamano menor.

## 3) Patrones de layout

- Shell de chat:
  - header fijo en flujo normal.
  - composer fijo en flujo normal.
  - mensajes en zona scrollable unica.
- Anclaje de pantalla:
  - viewport de chat controlado (`h-dvh` + `overflow-hidden`).
- Contenido:
  - ancho maximo centrado (`max-w-4xl`) para legibilidad.

## 4) Patrones de componentes

- Usar infraestructura compuesta de burbujas (`ChatBubble.*`) para conversacion.
- No renderizar logica de estado con texto inline suelto fuera del patron compuesto.
- Estados visuales por rol/estado:
  - `user`, `assistant`, `system`.
  - `complete`, `streaming`, `interrupted`, `error`.
- Errores:
  - se muestran in-stream como burbuja `destructive`.
  - acciones (`Reintentar`) viven en footer de burbuja.

## 5) Estados y feedback

- `streaming`: indicar `Generando...` en footer de burbuja assistant.
- imagen en `streaming`: usar placeholder o preview parcial dentro de la misma burbuja assistant.
- `interrupted`: conservar contenido parcial y mostrar `Reintentar`.
- `error`: burbuja destructiva con mensaje y accion `Reintentar`.
- `empty`: estado inicial claro cuando no hay conversacion.

## 6) Theming

- Estrategia oficial:
  - `System / Light / Dark`.
  - `system` por defecto.
  - persistencia local de preferencia.
- Selector de tema en header.
- El diseno debe mantener contraste suficiente en ambos modos.

## 7) Accesibilidad

- Focus visible en elementos interactivos.
- Navegacion por teclado funcional para acciones principales.
- Etiquetas y textos de accion explicitos.
- Objetivos tactiles adecuados en controles de header y composer.

## 8) Motion e interaccion

- Transiciones sutiles; evitar animacion distractora.
- Cambios de estado deben sentirse rapidos y comprensibles.
- No introducir motion compleja sin necesidad funcional.

## 9) Do / Don't

Do:

- Usar tokens semanticos y variantes existentes.
- Mantener patron compuesto para burbujas y acciones.
- Mantener server-first con islas cliente minimas para interactividad.

Don't:

- Reintroducir banner de error global separado del stream de chat.
- Romper la regla de scroll unico de mensajes.
- Acoplar logica de estado compleja directamente en markup inline repetido.
