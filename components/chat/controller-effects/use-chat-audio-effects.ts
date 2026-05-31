import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { getErrorMessage } from '@/components/chat/chat-controller-errors';
import { parseApiErrorMessage } from '@/lib/chat-dtos';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { Dispatch, RefObject } from 'react';

interface UseChatAudioEffectsParams {
  deps: {
    addErrorBubble: (message: string) => void;
    dispatch: Dispatch<ChatAction>;
  };
  refs: {
    audioElementRef: RefObject<HTMLAudioElement | null>;
    audioUrlRef: RefObject<string | null>;
  };
  runtime: {
    playingMessageId: string | null;
  };
}

export function useChatAudioEffects({ deps, refs, runtime }: UseChatAudioEffectsParams) {
  const t = useTranslations('errors');
  const { addErrorBubble, dispatch } = deps;
  const { audioElementRef, audioUrlRef } = refs;
  const { playingMessageId } = runtime;

  const releaseAudioResources = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    dispatch({ payload: null, type: 'audio/set-playing-message-id' });
  }, [audioElementRef, audioUrlRef, dispatch]);

  const stopPlayingAudio = useCallback(() => {
    releaseAudioResources();
    dispatch({ payload: null, type: 'audio/set-tts-loading-message-id' });
  }, [dispatch, releaseAudioResources]);

  const playMessageAudio = useCallback(
    async (messageId: string, messageText: string) => {
      const trimmedText = messageText.trim();

      if (!trimmedText) {
        return;
      }

      if (playingMessageId === messageId) {
        stopPlayingAudio();
        return;
      }

      stopPlayingAudio();
      dispatch({
        payload: messageId,
        type: 'audio/set-tts-loading-message-id',
      });

      try {
        const response = await fetch('/api/audio/speech', {
          body: JSON.stringify({ text: trimmedText }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(parseApiErrorMessage(payload) || t('ttsFailed'));
        }

        const blob = await response.blob();

        if (!blob.size) {
          throw new Error(t('noAudioContent'));
        }

        const audioUrl = URL.createObjectURL(blob);
        const audioElement = new Audio(audioUrl);
        audioElementRef.current = audioElement;
        audioUrlRef.current = audioUrl;

        audioElement.onended = () => {
          releaseAudioResources();
        };

        dispatch({ payload: messageId, type: 'audio/set-playing-message-id' });
        await audioElement.play();
      } catch (error) {
        addErrorBubble(getErrorMessage(error));
        releaseAudioResources();
      } finally {
        dispatch({ payload: null, type: 'audio/set-tts-loading-message-id' });
      }
    },
    [
      addErrorBubble,
      audioElementRef,
      audioUrlRef,
      dispatch,
      playingMessageId,
      releaseAudioResources,
      stopPlayingAudio,
      t,
    ]
  );

  return {
    playMessageAudio,
    releaseAudioResources,
    stopPlayingAudio,
  };
}
