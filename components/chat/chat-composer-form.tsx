'use client';

import { ImagePlus, Mic, Plus } from 'lucide-react';

import { useChatComposer } from '@/components/chat/chat-composer-provider';
import {
  ComposerActionsRow,
  ComposerModeBadge,
  ComposerRatioSelect,
  ComposerSubmitButton,
  ComposerToolbar,
} from '@/components/chat/composer';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

function ComposerPlusMenu({
  isSubmitting,
  onToggleImageMode,
}: {
  isSubmitting: boolean;
  onToggleImageMode: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isSubmitting} size="icon-sm" type="button" variant="outline">
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onToggleImageMode}>
              <ImagePlus />
              <span>Generar imagenes</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>Opciones del composer</TooltipContent>
    </Tooltip>
  );
}

function ComposerMicButton({
  isRecording,
  isSubmitting,
  isTranscribing,
  onToggleRecording,
}: {
  isRecording: boolean;
  isSubmitting: boolean;
  isTranscribing: boolean;
  onToggleRecording: () => Promise<void>;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={isRecording ? 'Detener dictado' : 'Iniciar dictado'}
          disabled={isSubmitting || isTranscribing}
          onClick={() => {
            void onToggleRecording();
          }}
          size="icon-sm"
          type="button"
          variant={isRecording ? 'destructive' : 'outline'}
        >
          <Mic />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>
        {isRecording ? 'Detener dictado' : 'Iniciar dictado'}
      </TooltipContent>
    </Tooltip>
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
