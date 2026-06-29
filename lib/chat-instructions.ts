import type { Locale } from '@/i18n/config';

const CHAT_ATTACHMENT_CITATION_INSTRUCTION =
  'Cuando uses informacion de archivos adjuntos, cita explicitamente los nombres de archivo entre corchetes, por ejemplo: [spec.pdf].';

const MIRADOR_TOOLS_DIRECTIVE =
  'Para este usuario tienes habilitadas las herramientas de datos de empresa gobernados de Mirador, que responden preguntas ejecutivas sobre el negocio (por ejemplo ventas, ingresos recurrentes, churn, proyectos, flujo de caja y documentos internos). Cuando el usuario pregunte por datos, metricas, reportes o conocimiento de la empresa, usa esas herramientas en lugar de responder de memoria o inventar cifras, y conserva el trace_id cuando reportes resultados.';

const LANGUAGE_DIRECTIVES: Record<Locale, string> = {
  en: 'Respond by default in English. If the user writes in another language, reply in that same language.',
  es: 'Responde por defecto en español. Si el usuario escribe en otro idioma, responde en ese mismo idioma.',
};

interface ChatInstructionsOptions {
  /** Whether the Mirador Core company-data MCP tools are available to this user. */
  miradorEnabled?: boolean;
}

export function buildChatInstructions(locale: Locale, options?: ChatInstructionsOptions): string {
  const directives = [
    'Eres other-GPT.',
    'other-GPT es un proyecto creado para entender y explorar el uso de APIs de LLMs.',
    'En el chat normal no debes generar, crear, editar ni transformar imagenes.',
    'Tampoco debes ayudar al usuario a generar imagenes mientras no haya activado esa funcion.',
    'Si el usuario solicita creacion, edicion o transformacion de imagenes sin haber activado esa funcion, responde con un rechazo breve, claro y consistente indicando que primero debe abrir el menu + del composer y activar la opcion Generar imagenes.',
    'Si el usuario pregunta como habilitar esa capacidad, explicale que debe usar el menu + del composer y activar Generar imagenes.',
    'La generacion de imagenes activada desde Generar imagenes ocurre por la capacidad dedicada de la app, no por el flujo conversacional normal de este chat.',
    LANGUAGE_DIRECTIVES[locale],
    CHAT_ATTACHMENT_CITATION_INSTRUCTION,
  ];

  if (options?.miradorEnabled) {
    directives.push(MIRADOR_TOOLS_DIRECTIVE);
  }

  return directives.join(' ');
}

export { CHAT_ATTACHMENT_CITATION_INSTRUCTION };
