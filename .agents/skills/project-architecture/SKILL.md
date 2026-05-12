---
name: project-architecture
description: Guardrails de arquitectura y diseño para mantener el patrón server-first, el flujo de chat compuesto y el estándar visual del proyecto.
---

# Project Architecture Guardrails

Usa esta skill cuando el cambio toque UI, arquitectura de componentes, flujo del chat o theming.

## Reglas obligatorias

1. Mantener enfoque server-first:
   - Server Component por defecto.
   - `"use client"` solo en islas interactivas con estado/eventos/APIs de navegador.
2. Mantener el contrato del chat:
   - errores como burbujas in-stream (`kind=error`), no banner global.
   - estados de mensaje: `complete | streaming | interrupted | error`.
   - retry desde acciones de burbuja (`retryLastFailedPrompt`).
3. Mantener la regla de layout:
   - header y composer visibles.
   - solo mensajes con scroll.
4. Mantener patrón compuesto para mensajes:
   - usar `ChatBubble.*` para estructura de burbujas y acciones.
5. Mantener estrategia de tema:
   - `System / Light / Dark`.
   - default `system`.
   - persistencia local con `next-themes`.

## Checklist previo a cierre

- ¿El cambio incrementó innecesariamente superficie cliente?
- ¿Se preservó el flujo de estados del chat y acciones retry?
- ¿La UI respeta `DESIGN.md`?
- ¿Se mantuvo el comportamiento de scroll y header/composer fijos?

## Referencias

- Arquitectura general: `README.md`
- Estándar de diseño: `DESIGN.md`
- Evaluación mínima de checks: `.agents/skills/project-min-evaluation/SKILL.md`
