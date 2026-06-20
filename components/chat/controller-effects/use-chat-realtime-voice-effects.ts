import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { getErrorMessage } from '@/components/chat/chat-controller-errors';
import { parseApiErrorMessage } from '@/lib/chat-dtos';
import { createClientId } from '@/lib/client-id';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatVoiceStatus } from '@/components/chat/chat-types';
import type { Dispatch, RefObject } from 'react';

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

/** The text accumulated for the assistant's current spoken turn. */
export interface ChatVoiceTurn {
  assistantMessageId: string | null;
  assistantText: string;
}

interface UseChatRealtimeVoiceEffectsParams {
  deps: {
    addErrorBubble: (message: string) => void;
    dispatch: Dispatch<ChatAction>;
  };
  refs: {
    dataChannelRef: RefObject<RTCDataChannel | null>;
    localStreamRef: RefObject<MediaStream | null>;
    peerConnectionRef: RefObject<RTCPeerConnection | null>;
    remoteAudioRef: RefObject<HTMLAudioElement | null>;
    voiceTurnRef: RefObject<ChatVoiceTurn>;
  };
  voice: {
    isMuted: boolean;
    status: ChatVoiceStatus;
  };
}

interface RealtimeServerEvent {
  delta?: string;
  transcript?: string;
  type?: string;
}

export function useChatRealtimeVoiceEffects({
  deps,
  refs,
  voice,
}: UseChatRealtimeVoiceEffectsParams) {
  const t = useTranslations('errors');
  const { addErrorBubble, dispatch } = deps;
  const { dataChannelRef, localStreamRef, peerConnectionRef, remoteAudioRef, voiceTurnRef } = refs;
  const { isMuted, status } = voice;

  const closeConnection = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    localStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    voiceTurnRef.current = { assistantMessageId: null, assistantText: '' };
  }, [dataChannelRef, localStreamRef, peerConnectionRef, remoteAudioRef, voiceTurnRef]);

  const stopVoiceSession = useCallback(() => {
    closeConnection();
    dispatch({ payload: false, type: 'voice/set-assistant-speaking' });
    dispatch({ type: 'voice/reset' });
  }, [closeConnection, dispatch]);

  const handleServerEvent = useCallback(
    (event: RealtimeServerEvent) => {
      const eventType = event.type ?? '';

      // Completed transcription of the user's spoken turn.
      if (eventType === 'conversation.item.input_audio_transcription.completed') {
        const text = event.transcript?.trim();
        if (text) {
          dispatch({
            payload: { messageId: createClientId(), text },
            type: 'messages/append-voice-user',
          });
        }
        return;
      }

      // Assistant's spoken transcript streams in (GA + legacy event names).
      if (
        eventType === 'response.output_audio_transcript.delta' ||
        eventType === 'response.audio_transcript.delta'
      ) {
        const turn = voiceTurnRef.current;

        if (!turn.assistantMessageId) {
          const assistantMessageId = createClientId();
          turn.assistantMessageId = assistantMessageId;
          turn.assistantText = '';
          dispatch({
            payload: { messageId: assistantMessageId },
            type: 'messages/append-voice-assistant',
          });
          dispatch({ payload: true, type: 'voice/set-assistant-speaking' });
        }

        turn.assistantText += event.delta ?? '';
        dispatch({
          payload: { assistantMessageId: turn.assistantMessageId, content: turn.assistantText },
          type: 'messages/update-assistant-stream',
        });
        return;
      }

      if (
        eventType === 'response.output_audio_transcript.done' ||
        eventType === 'response.audio_transcript.done'
      ) {
        const turn = voiceTurnRef.current;
        if (turn.assistantMessageId) {
          dispatch({
            payload: { assistantMessageId: turn.assistantMessageId },
            type: 'messages/complete-assistant',
          });
        }
        voiceTurnRef.current = { assistantMessageId: null, assistantText: '' };
        dispatch({ payload: false, type: 'voice/set-assistant-speaking' });
      }
    },
    [dispatch, voiceTurnRef]
  );

  const startVoiceSession = useCallback(async () => {
    if (status !== 'idle') {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (!navigator.mediaDevices || typeof RTCPeerConnection === 'undefined') {
      addErrorBubble(t('voiceUnsupported'));
      return;
    }

    dispatch({ payload: 'connecting', type: 'voice/set-status' });
    voiceTurnRef.current = { assistantMessageId: null, assistantText: '' };

    try {
      const sessionResponse = await fetch('/api/realtime/session', { method: 'POST' });

      if (!sessionResponse.ok) {
        const payload = await sessionResponse.json().catch(() => null);
        throw new Error(parseApiErrorMessage(payload) || t('voiceFailed'));
      }

      const { model, value } = (await sessionResponse.json()) as { model: string; value: string };

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = mediaStream;

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      remoteAudioRef.current = remoteAudio;

      peerConnection.ontrack = (trackEvent) => {
        remoteAudio.srcObject = trackEvent.streams[0] ?? null;
      };

      peerConnection.addEventListener('connectionstatechange', () => {
        const connectionState = peerConnection.connectionState;

        if (connectionState === 'connected') {
          dispatch({ payload: 'connected', type: 'voice/set-status' });
          return;
        }

        if (
          connectionState === 'disconnected' ||
          connectionState === 'failed' ||
          connectionState === 'closed'
        ) {
          stopVoiceSession();
        }
      });

      mediaStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, mediaStream);
      });

      const dataChannel = peerConnection.createDataChannel('oai-events');
      dataChannelRef.current = dataChannel;
      dataChannel.addEventListener('message', (messageEvent: MessageEvent<string>) => {
        try {
          handleServerEvent(JSON.parse(messageEvent.data) as RealtimeServerEvent);
        } catch {
          // Ignore malformed events; the connection stays usable.
        }
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `${OPENAI_REALTIME_CALLS_URL}?model=${encodeURIComponent(model)}`,
        {
          body: offer.sdp,
          headers: {
            authorization: `Bearer ${value}`,
            'content-type': 'application/sdp',
          },
          method: 'POST',
        }
      );

      if (!sdpResponse.ok) {
        throw new Error(t('voiceFailed'));
      }

      const answerSdp = await sdpResponse.text();
      await peerConnection.setRemoteDescription({ sdp: answerSdp, type: 'answer' });
    } catch (error) {
      closeConnection();
      addErrorBubble(getErrorMessage(error));
      dispatch({ payload: 'error', type: 'voice/set-status' });
    }
  }, [
    addErrorBubble,
    closeConnection,
    dataChannelRef,
    dispatch,
    handleServerEvent,
    localStreamRef,
    peerConnectionRef,
    remoteAudioRef,
    status,
    stopVoiceSession,
    t,
    voiceTurnRef,
  ]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }

    const shouldMute = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !shouldMute;
    });
    dispatch({ payload: shouldMute, type: 'voice/set-muted' });
  }, [dispatch, isMuted, localStreamRef]);

  return { startVoiceSession, stopVoiceSession, toggleMute };
}
