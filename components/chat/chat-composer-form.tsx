'use client';

import { useCallback } from 'react';

import { useChatComposer } from '@/components/chat/chat-composer-provider';
import {
  ComposerActionsRow,
  ComposerAttachmentsUploader,
  ComposerMicButton,
  ComposerModeBadge,
  ComposerPlusMenu,
  ComposerRatioSelect,
  ComposerSubmitButton,
  ComposerToolbar,
} from '@/components/chat/composer';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function ComposerRoot({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

function ComposerToolbarRegion({
  children,
  isVisible,
}: {
  children: React.ReactNode;
  isVisible: boolean;
}) {
  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={cn(
        'overflow-hidden transition-[max-height,margin,opacity,transform] duration-200 [transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none',
        isVisible
          ? 'mb-1 max-h-14 translate-y-0 opacity-100'
          : 'pointer-events-none mb-0 max-h-0 -translate-y-1 opacity-0'
      )}
    >
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

function ComposerInput({
  children,
  isDisabled,
  isImageMode,
  onKeyDown,
  onValueChange,
  value,
}: {
  children: React.ReactNode;
  isDisabled: boolean;
  isImageMode: boolean;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Textarea
        className="min-h-18 px-4 py-3.5 pr-24"
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

      <div className="absolute right-3 bottom-3 flex items-center gap-1.5">{children}</div>
    </div>
  );
}

export function ChatComposerForm() {
  const {
    input,
    attachments,
    addFilesAsAttachments,
    errorMessage,
    isImageGenerationMode,
    isRecording,
    isSendDisabled,
    isSubmitting,
    isTranscribing,
    selectedImageAspectRatio,
    removeAttachment,
    sendMessage,
    setInput,
    setSelectedImageAspectRatio,
    stopGeneration,
    toggleImageGenerationMode,
    toggleRecording,
  } = useChatComposer();

  const handleSendMessage = useCallback(async () => {
    await sendMessage();
  }, [sendMessage]);

  return (
    <ComposerRoot>
      <ComposerToolbarRegion isVisible={isImageGenerationMode}>
        <ComposerToolbar>
          <ComposerModeBadge onRemove={toggleImageGenerationMode} />
          <ComposerRatioSelect
            isDisabled={isSubmitting}
            onValueChange={setSelectedImageAspectRatio}
            value={selectedImageAspectRatio}
          />
        </ComposerToolbar>
      </ComposerToolbarRegion>

      <ComposerAttachmentsUploader
        attachments={attachments}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onAddFiles={addFilesAsAttachments}
        onRemoveAttachment={removeAttachment}
      >
        {({ contextAttachmentCount, openContextModal, openFileDialog }) => (
          <ComposerActionsRow>
            <ComposerPlusMenu
              contextAttachmentCount={contextAttachmentCount}
              isSubmitting={isSubmitting}
              onAddAttachments={openFileDialog}
              onOpenAttachmentsContext={openContextModal}
              onToggleImageMode={toggleImageGenerationMode}
            />

            <ComposerInput
              isDisabled={isSubmitting}
              isImageMode={isImageGenerationMode}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
              onValueChange={setInput}
              value={input}
            >
              <ComposerMicButton
                isRecording={isRecording}
                isSubmitting={isSubmitting}
                isTranscribing={isTranscribing}
                onToggleRecording={toggleRecording}
              />

              <ComposerSubmitButton
                isImageGenerationMode={isImageGenerationMode}
                isSendDisabled={isSendDisabled}
                isSubmitting={isSubmitting}
                onSend={() => {
                  void handleSendMessage();
                }}
                onStop={stopGeneration}
              />
            </ComposerInput>
          </ComposerActionsRow>
        )}
      </ComposerAttachmentsUploader>
    </ComposerRoot>
  );
}
