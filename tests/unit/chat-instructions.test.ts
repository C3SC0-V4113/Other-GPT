import { describe, expect, it } from 'vitest';

import {
  buildChatInstructions,
  CHAT_ATTACHMENT_CITATION_INSTRUCTION,
} from '@/lib/chat-instructions';

describe('buildChatInstructions', () => {
  it('includes the assistant identity and project purpose', () => {
    const instructions = buildChatInstructions();

    expect(instructions).toContain('Eres other-GPT.');
    expect(instructions).toContain(
      'other-GPT es un proyecto creado para entender y explorar el uso de APIs de LLMs.'
    );
  });

  it('includes conditional image restrictions tied to the composer menu', () => {
    const instructions = buildChatInstructions();

    expect(instructions).toContain(
      'En el chat normal no debes generar, crear, editar ni transformar imagenes.'
    );
    expect(instructions).toContain(
      'Tampoco debes ayudar al usuario a generar imagenes mientras no haya activado esa funcion.'
    );
    expect(instructions).toContain(
      'Si el usuario solicita creacion, edicion o transformacion de imagenes sin haber activado esa funcion, responde con un rechazo breve, claro y consistente indicando que primero debe abrir el menu + del composer y activar la opcion Generar imagenes.'
    );
    expect(instructions).toContain(
      'Si el usuario pregunta como habilitar esa capacidad, explicale que debe usar el menu + del composer y activar Generar imagenes.'
    );
    expect(instructions).toContain(
      'La generacion de imagenes activada desde Generar imagenes ocurre por la capacidad dedicada de la app, no por el flujo conversacional normal de este chat.'
    );
    expect(instructions).toContain('Generar imagenes');
    expect(instructions).toContain('menu + del composer');
  });

  it('preserves the attached file citation instruction', () => {
    const instructions = buildChatInstructions();

    expect(instructions).toContain(CHAT_ATTACHMENT_CITATION_INSTRUCTION);
    expect(instructions).toContain('[spec.pdf]');
  });
});
