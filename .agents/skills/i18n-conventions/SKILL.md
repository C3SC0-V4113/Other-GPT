---
name: i18n-conventions
description: Convenciones de internacionalizacion (next-intl, sin routing) para localizar UID, propagar el locale al LLM y mantener paridad de diccionarios.
---

# i18n Conventions

Usa esta skill cuando agregues o cambies texto visible, cuando toques el selector de idioma, la
resolucion de locale, o el system prompt del LLM.

## Arquitectura

- Libreria: `next-intl` en modo **sin i18n routing** (no cambia la URL).
- Locale resuelto en servidor por `i18n/locale.ts#getUserLocale`:
  cookie `NEXT_LOCALE` -> negociacion `Accept-Language` -> `defaultLocale` (`en`).
- Configuracion de request: `i18n/request.ts` (`getRequestConfig`) carga `messages/{locale}.json`.
- Persistencia: server action `i18n/actions.ts#changeLocaleAction` (escribe `NEXT_LOCALE`).
- Provider cliente: `NextIntlClientProvider` en `app/layout.tsx`; `<html lang>` dinamico.

## Reglas

1. Nunca hardcodear texto visible. Todo va en `messages/en.json` y `messages/es.json`.
2. Mantener **paridad de claves** entre locales (lo valida `tests/unit/i18n-messages.test.ts` y la
   type augmentation en `global.d.ts`).
3. Render:
   - Server Components (incl. async): `getTranslations('namespace')` / `getLocale()`.
   - Client Components y hooks cliente: `useTranslations('namespace')` / `useLocale()`.
4. Interpolacion ICU: `t('clave', { name })` con `"...{name}..."` en el JSON.
5. El selector de idioma es la unica isla cliente nueva; debe permanecer aislado (cambia cookie +
   `router.refresh()`), sin elevar estado global ni provocar re-renders del arbol completo.
6. Alcance backend: el locale se propaga al LLM via `buildChatInstructions(locale)`; los mensajes de
   error de las APIs **no** se localizan (ver ADR 0005).

## Como agregar un idioma

1. Crear `messages/<locale>.json` con las mismas claves que `en.json`.
2. Anadir el codigo a `locales` en `i18n/config.ts`.
3. Ampliar el mapeo de etiquetas en `components/i18n/language-selector.tsx`.
4. Anadir la directiva de idioma en `LANGUAGE_DIRECTIVES` de `lib/chat-instructions.ts`.
5. Ejecutar `npm run typecheck` y `npm run test`.

## Como agregar una clave

1. Anadir la clave en **ambos** diccionarios (`en.json` y `es.json`).
2. Usarla con `t('namespace.clave')`.
3. `npm run typecheck` valida que la clave exista; el test de paridad valida ambos locales.

## Referencias

- Decision: `docs/adr/0005-internationalization-cookie-based-next-intl.md`
- Arquitectura general: `README.md` (seccion Internacionalizacion)
- Guardrails: `.agents/skills/project-architecture/SKILL.md`
