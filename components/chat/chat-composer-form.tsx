'use client';

import { useChatComposer } from '@/components/chat/chat-composer-provider';
import {
  ComposerActionsRow,
  ComposerMicButton,
  ComposerModeBadge,
  ComposerPlusMenu,
  ComposerRatioSelect,
  ComposerSubmitButton,
  ComposerToolbar,
} from '@/components/chat/composer';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

function ComposerRoot({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

function ComposerInput({
  isDisabled,
  isImageMode,
  onKeyDown,
  onValueChange,
  value,
}: {
  isDisabled: boolean;
  isImageMode: boolean;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <Textarea
      disabled={isDisabled}
      name="message"
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
      onKeyDown={onKeyDown}
      placeholder={isImageMode ? 'Describe la imagen a generar...' : 'Send a message...'}
      rows={1}
      value={value}
    />
  );
}

export function ChatComposerForm() {
  const {
    input,
    isImageGenerationMode,
    isRecording,
    isSendDisabled,
    isSubmitting,
    isTranscribing,
    selectedImageAspectRatio,
    sendMessage,
    setInput,
    setSelectedImageAspectRatio,
    stopGeneration,
    toggleImageGenerationMode,
    toggleRecording,
  } = useChatComposer();

  return (
    <ComposerRoot>
      {isImageGenerationMode ? (
        <ComposerToolbar>
          <ComposerModeBadge onRemove={toggleImageGenerationMode} />
          <Separator className="h-5" orientation="vertical" />
          <ComposerRatioSelect
            isDisabled={isSubmitting}
            onValueChange={setSelectedImageAspectRatio}
            value={selectedImageAspectRatio}
          />
        </ComposerToolbar>
      ) : null}

      <ComposerActionsRow>
        <ComposerPlusMenu
          isSubmitting={isSubmitting}
          onToggleImageMode={toggleImageGenerationMode}
        />

        <ComposerMicButton
          isRecording={isRecording}
          isSubmitting={isSubmitting}
          isTranscribing={isTranscribing}
          onToggleRecording={toggleRecording}
        />

        <Separator className="h-9" orientation="vertical" />

        <ComposerInput
          isDisabled={isSubmitting}
          isImageMode={isImageGenerationMode}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          onValueChange={setInput}
          value={input}
        />

        <ComposerSubmitButton
          isImageGenerationMode={isImageGenerationMode}
          isSendDisabled={isSendDisabled}
          isSubmitting={isSubmitting}
          onSend={() => {
            void sendMessage();
          }}
          onStop={stopGeneration}
        />
      </ComposerActionsRow>
    </ComposerRoot>
  );
}
