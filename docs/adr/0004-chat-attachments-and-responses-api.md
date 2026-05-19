# ADR 0004: Adjuntos de Chat y Migracion a Responses API

- Fecha: 2026-05-17
- Actualizado: 2026-05-18
- Estado: Accepted

## Contexto

El chat soportaba texto e imagen, pero no permitia adjuntar archivos reutilizables en la sesion.
Ademas, `POST /api/chat` estaba basado en `chat.completions`, lo que no es la via ideal para
enviar entradas de archivo e imagen como contexto multimodal.

Se requeria:

- adjuntar archivos desde el composer con UX de drag-and-drop contextual,
- reutilizar adjuntos en prompts de chat e imagen,
- limpiar archivos remotos al limpiar sesion,
- mantener streaming de texto en UI.

## Decision

1. Migrar `POST /api/chat` a `OpenAI Responses API` en modo streaming.
2. Introducir adjuntos activos por sesion con endpoints dedicados:
   - `POST /api/chat/attachments`
   - `DELETE /api/chat/attachments/[attachmentId]`
3. Enviar adjuntos al modelo con mapeo por tipo:
   - imagenes como `input_image`,
   - documentos y texto como `input_file`.
4. Mantener los adjuntos en sesion hasta que el usuario los elimine o limpie el chat.
5. Al ejecutar `DELETE /api/chat`, limpiar estado local y borrar archivos remotos asociados.
6. En UI:
   - el menu `+` expone siempre "Archivos en contexto",
   - la gestion de adjuntos ocurre en modal dedicado (lista compacta con preview/icono, nombre, tamano y quitar),
   - el dropzone del composer se desactiva cuando el modal esta abierto,
   - el modal habilita su propio dropzone con overlay durante drag y carga.

## Consecuencias

### Positivas

- Soporte real para contexto de documentos (pdf, docx, xlsx, pptx, markdown, imagenes, etc.).
- Mejor alineacion con la API recomendada para entradas multimodales y herramientas.
- Conserva experiencia de streaming sin cambiar la estructura base del chat v2.

### Tradeoffs

- Mayor complejidad de estado en composer y session store.
- Nuevo costo operativo por ciclo de vida de archivos (subida, referencia y borrado remoto).
- Se requiere disciplina en validaciones de limites para evitar payloads pesados.
