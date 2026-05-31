import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { getErrorMessage } from '@/components/chat/chat-controller-errors';
import { parseApiErrorMessage, parseTranscriptionResponse } from '@/lib/chat-dtos';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { Dispatch, RefObject } from 'react';

interface UseChatRecordingEffectsParams {
  deps: {
    addErrorBubble: (message: string) => void;
    dispatch: Dispatch<ChatAction>;
  };
  recording: {
    isRecording: boolean;
    isTranscribing: boolean;
  };
  refs: {
    mediaRecorderRef: RefObject<MediaRecorder | null>;
    mediaStreamRef: RefObject<MediaStream | null>;
    recordedChunksRef: RefObject<BlobPart[]>;
  };
}

export function useChatRecordingEffects({ deps, recording, refs }: UseChatRecordingEffectsParams) {
  const t = useTranslations('errors');
  const { addErrorBubble, dispatch } = deps;
  const { isRecording, isTranscribing } = recording;
  const { mediaRecorderRef, mediaStreamRef, recordedChunksRef } = refs;

  const toggleRecording = useCallback(async () => {
    if (isTranscribing) {
      return;
    }

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      addErrorBubble(t('recordingUnsupported'));
      return;
    }

    dispatch({ payload: '', type: 'feedback/set-error-message' });

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(mediaStream);

      recordedChunksRef.current = [];
      mediaStreamRef.current = mediaStream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        dispatch({ payload: false, type: 'recording/set-recording' });

        const audioBlob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });

        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        recordedChunksRef.current = [];

        if (!audioBlob.size) {
          return;
        }

        const audioFile = new File([audioBlob], 'recording.webm', {
          type: audioBlob.type || 'audio/webm',
        });
        const formData = new FormData();
        formData.append('audio', audioFile);

        dispatch({ payload: true, type: 'recording/set-transcribing' });

        try {
          const response = await fetch('/api/audio/transcriptions', {
            body: formData,
            method: 'POST',
          });

          if (!response.ok) {
            const payload = await response.json();
            throw new Error(parseApiErrorMessage(payload) || t('transcribeFailed'));
          }

          const payload = await response.json();
          const parsedResponse = parseTranscriptionResponse(payload);

          if (parsedResponse.ok) {
            const nextInput = parsedResponse.data.text.trim();

            if (nextInput) {
              dispatch({ payload: nextInput, type: 'composer/set-input' });
            }
          }
        } catch (error) {
          const resolvedError = getErrorMessage(error);
          dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
          addErrorBubble(resolvedError);
        } finally {
          dispatch({ payload: false, type: 'recording/set-transcribing' });
        }
      };

      mediaRecorder.start();
      dispatch({ payload: true, type: 'recording/set-recording' });
    } catch {
      addErrorBubble(t('micAccessFailed'));
      dispatch({ payload: false, type: 'recording/set-recording' });
    }
  }, [
    addErrorBubble,
    dispatch,
    isRecording,
    isTranscribing,
    mediaRecorderRef,
    mediaStreamRef,
    recordedChunksRef,
    t,
  ]);

  return { toggleRecording };
}
