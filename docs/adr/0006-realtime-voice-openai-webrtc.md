# ADR 0006: Realtime Voice via OpenAI WebRTC

- Date: 2026-06-19
- Status: Accepted

## Context

El chat soportaba voz solo de forma batch: el boton de microfono graba audio, lo
envia a `POST /api/audio/transcriptions` y rellena el input con el texto. Eso no es
una conversacion de voz en tiempo real.

Se necesitaba un asistente de voz realtime (speech-to-speech, baja latencia) sobre
el chat existente, sin:

- romper el patron server-first ni el contrato BFF (la `OPENAI_API_KEY` nunca llega
  al browser),
- reemplazar el chat de texto ni el dictado batch existente,
- abandonar el patron de slices descrito en ADR 0003 (state, actions, reducer de
  dominio, effect hook y context).

Tambien debia quedar restringido a roles elevados (`pro` / `admin`), igual que la
generacion de imagenes.

## Decision

1. Proveedor y transporte

- Se usa la **OpenAI Realtime API** (modelo `gpt-realtime`, GA) por **WebRTC**
  directo entre el browser y OpenAI, con un **ephemeral client secret** minteado
  server-side.
- Se descarta **Vercel AI SDK** como orquestador: su capa de voz (v5) solo expone
  TTS y STT por separado (arquitectura _sandwich_ STT -> LLM -> TTS, con latencia);
  no hay speech-to-speech realtime nativo (issue abierto `vercel/ai#3176`).

2. Ruta server del token

- `POST /api/realtime/session`: guard de rol (`401` sin sesion, `403`
  `REALTIME_VOICE_FORBIDDEN` para usuarios basicos, fail-closed) que espeja
  `POST /api/images`, luego llama a `POST /v1/realtime/client_secrets` con la API
  key real e instrucciones por locale (`buildChatInstructions`). Devuelve al browser
  solo el `value` efimero y el `model`.

3. Conexion WebRTC en el cliente

- Hook `use-chat-realtime-voice-effects.ts`: pide el token, abre `getUserMedia`,
  crea `RTCPeerConnection`, intercambia SDP contra `POST /v1/realtime/calls`, y
  reproduce el audio remoto en un `HTMLAudioElement`.
- Un data channel (`oai-events`) entrega los transcripts: el del usuario
  (`conversation.item.input_audio_transcription.completed`) y el del asistente
  (`response.output_audio_transcript.delta/done`, con alias legacy).

4. Continuidad con el transcript

- Los transcripts se vuelcan al mismo historial reusando el dominio `messages`:
  dos acciones nuevas (`messages/append-voice-user`, `messages/append-voice-assistant`)
  mas las existentes de streaming/complete. La respuesta del asistente se ve en vivo
  en su burbuja.

5. Estado y UI

- Slice `voice` (`status`, `isMuted`, `isAssistantSpeaking`) con su reducer y
  contexto (`useChatVoiceActions`).
- UI shadcn: boton dedicado (`composer-voice-button`) junto al de dictado y panel
  inline toggleable (`composer-voice-panel`) con estado, indicador de actividad,
  mute y colgar. Ambos gateados por `canUseRealtimeVoice` (prop del Server Component).

## Consequences

### Positivas

- Voz realtime de baja latencia sin exponer la API key (UDP directo a OpenAI).
- Reusa el patron de slices/effects/contexts; el flujo de texto y el dictado batch
  quedan intactos.
- Gating de rol consistente con imagenes, con el server como fuente de verdad.

### Tradeoffs

- Dependencia directa del transporte WebRTC y de los nombres de eventos del Realtime
  API (manejados de forma defensiva ante el rename GA).
- Mas estado cliente y manejo de ciclo de vida de `RTCPeerConnection` / tracks.

### Riesgos a vigilar

- Cambios futuros en endpoints o nombres de eventos del Realtime API.
- Compatibilidad de WebRTC / `getUserMedia` entre navegadores.
- Autoplay de audio remoto segun politicas del navegador.

## Relacion con otros documentos

- `README.md`: mapa de capacidades y endpoints (suma `/api/realtime/session`).
- `DESIGN.md`: consistencia visual del boton y panel de voz.
- `AGENTS.md`: quality gates y referencias de arquitectura.
- ADR 0002 (multimodal) y ADR 0003 (reducer/providers/composition).
