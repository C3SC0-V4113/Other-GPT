# ADR 0002: Multimodal Chat Capabilities

- Date: 2026-05-14
- Status: Accepted

## Context

El chat soportaba solo mensajes de texto con streaming en `/api/chat`.
Se necesitaba agregar capacidades multimodales sin romper:

- el patron server-first,
- el contrato visual de `ChatBubble.*`,
- el flujo existente de `streaming / interrupted / error / retry`.

Ademas, la funcionalidad de audio y de imagen requeria rutas API separadas para mantener contratos claros por capacidad.

## Decision

Se adopta una extension multimodal v1 con estas decisiones:

1. Contrato de mensaje unificado

- `ChatMessage.content` pasa a union discriminada:
  - `text`: `{ type: 'text', text: string }`
  - `image`: `{ type: 'image', prompt, imageBase64, mimeType, aspectRatio }`
- Se mantienen `role` y estados UI actuales.

2. Politica de contexto de chat

- Los mensajes de imagen se persisten en sesion.
- Para prompts conversacionales en `/api/chat`, solo se envia al modelo el subconjunto `content.type === 'text'`.

3. Rutas API separadas por capacidad

- `POST /api/chat`: texto en streaming (existente).
- `POST /api/images`: generacion de imagen por prompt y aspect ratio.
- `POST /api/audio/transcriptions`: speech-to-text con `multipart/form-data`.
- `POST /api/audio/speech`: text-to-speech on-demand para reproducir respuestas.

4. Interaccion de composer y burbujas

- Composer agrega:
  - menu `+` para activar modo imagen,
  - pill removible de modo imagen,
  - selector de aspect ratio (`Auto`, `1:1`, `16:9`, `9:16`),
  - boton dedicado de dictado (toggle start/stop).
- Burbujas `assistant` completas de texto agregan acciones:
  - `Escuchar` (TTS),
  - `Copiar` (clipboard).

## Consequences

### Positivas

- Se agregan capacidades de imagen y audio sin mezclar contratos API.
- El flujo de texto existente se mantiene estable.
- Las acciones en burbuja conservan consistencia con el patron compuesto actual.

### Tradeoffs

- Mayor complejidad en estado cliente (`use-chat-controller`) por control de grabacion, TTS y feedback por mensaje.
- Mayor volumen de datos en memoria de sesion por almacenar `imageBase64`.

### Riesgos a vigilar

- Uso de memoria por payload base64 en sesiones extensas.
- Diferencias de compatibilidad de grabacion en navegadores.
- Errores de reproduccion/cancelacion de audio al alternar rapidamente mensajes.

## Relacion con otros documentos

- `README.md`: mapa de capacidades multimodales y endpoints.
- `DESIGN.md`: consistencia visual de estados y acciones en burbuja.
- `AGENTS.md`: quality gates y referencias de arquitectura.
