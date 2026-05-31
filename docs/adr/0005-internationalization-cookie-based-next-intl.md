# ADR 0005: Internacionalizacion basada en cookie con next-intl

- Fecha: 2026-05-31
- Estado: Accepted

## Contexto

La aplicacion tenia todos los textos visibles hardcodeados (mayormente en espanol) repartidos por los
componentes, sin infraestructura i18n, sin deteccion de idioma y sin propagar un idioma preferido al
LLM. Se requeria:

- selector de idioma en el header con un patron compacto de boton + menu,
- idioma por defecto tomado del sistema (`Accept-Language`),
- idiomas base `en` y `es`,
- propagar el idioma preferido al system prompt del LLM (que aun puede adaptarse si el usuario escribe
  en otro idioma),
- mantener el enfoque server-first y evitar re-renders innecesarios en la UI.

La app es de ruta unica (`/`) con estado de sesion en cookie, por lo que el ruteo por segmento
`[lang]` no aporta valor (no hay SEO de URLs localizadas que justifique reestructurar `app/`).

## Decision

1. Usar `next-intl` en modo **sin i18n routing** (sin cambiar la URL).
2. Resolver el locale en el servidor mediante `i18n/request.ts` (`getRequestConfig`), que delega en
   `i18n/locale.ts#getUserLocale`:
   - lee la cookie `NEXT_LOCALE` (eleccion explicita del usuario),
   - si no existe, negocia `Accept-Language` con `negotiator` + `@formatjs/intl-localematcher`,
   - cae al `defaultLocale` (`en`).
3. Persistir la eleccion con una server action (`i18n/actions.ts#changeLocaleAction`) que escribe la
   cookie `NEXT_LOCALE`.
4. Cargar los mensajes desde `messages/{en,es}.json` (diccionarios por namespace) y exponerlos:
   - en Server Components con `getTranslations` / `getLocale`,
   - en Client Components con `useTranslations` / `useLocale` via `NextIntlClientProvider`.
5. El selector de idioma (`components/i18n/language-selector.tsx`) es la unica isla cliente nueva:
   cambia la cookie con la server action y llama `router.refresh()` para re-renderizar el arbol server
   con el nuevo locale. Es pequeno y aislado para no provocar re-renders globales.
6. `<html lang>` se vuelve dinamico en `app/layout.tsx` segun el locale resuelto.
7. El locale se propaga al LLM: `buildChatInstructions(locale)` agrega una directiva de idioma por
   defecto y `POST /api/chat` lee el locale via `getUserLocale()`.
8. Type-safety: augmentation oficial de next-intl en `global.d.ts` (`AppConfig` con `Locale` y
   `Messages`), validada por `npm run typecheck`.

## Alternativas consideradas

- **Ruteo por segmento `app/[lang]`**: descartado por reestructuracion invasiva y choque con el modelo
  de cookie de sesion, sin beneficio de SEO en una app de interaccion de ruta unica.
- **Diccionarios propios sin libreria**: viable, pero next-intl aporta type-safety, ICU y soporte
  server/client estandar para App Router.

## Consecuencias

### Positivas

- UI totalmente localizada (en/es) con render server-first; los diccionarios no inflan el bundle
  cliente salvo donde se usan.
- Deteccion automatica por sistema y persistencia explicita por cookie.
- Validacion de claves de mensajes en tiempo de compilacion.
- Idioma del LLM alineado con la preferencia del usuario.

### Tradeoffs

- Cambiar idioma requiere `router.refresh()` (los mensajes se resuelven en el servidor).
- Los mensajes de error de las APIs NO se localizan (decision de alcance): permanecen como estan.
- Agregar un idioma implica un nuevo `messages/<locale>.json`, ampliar `locales` y el mapeo del
  selector.
