---
name: project-architecture
description: Guardrails de arquitectura y diseno para mantener el patron server-first, el flujo de chat compuesto y el estandar visual del proyecto.
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
4. Mantener patron compuesto para mensajes:
   - usar `ChatBubble.*` para estructura de burbujas y acciones.
5. Mantener estrategia de tema:
   - `System / Light / Dark`.
   - default `system`.
   - persistencia local con `next-themes`.
6. Mantener estrategia de i18n (`next-intl`, sin routing):
   - todo texto visible proviene de `messages/{locale}.json`; prohibido literal hardcodeado.
   - locale resuelto en servidor (`getUserLocale`): cookie `NEXT_LOCALE` -> `Accept-Language` -> default.
   - Server Components usan `getTranslations`/`getLocale`; Client Components `useTranslations`/`useLocale`.
   - el selector de idioma es la unica isla cliente: cambia la cookie y hace `router.refresh()`.
   - al agregar claves, mantener paridad entre `en.json` y `es.json` (validado por test + typecheck).

## Checklist previo a cierre

- ¿El cambio incremento innecesariamente superficie cliente?
- ¿Se preservo el flujo de estados del chat y acciones retry?
- ¿La UI respeta `DESIGN.md`?
- ¿Se mantuvo el comportamiento de scroll y header/composer fijos?
- ¿Todo texto nuevo visible se agrego a los diccionarios (en/es) en lugar de hardcodearse?

## Referencias

- Arquitectura general: `README.md`
- Estandar de diseno: `DESIGN.md`
- Sincronizacion de decisiones estructurales: `.agents/skills/decision-doc-sync/SKILL.md`
- Evaluacion minima de checks: `.agents/skills/project-min-evaluation/SKILL.md`
