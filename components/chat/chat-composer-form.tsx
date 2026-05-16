'use client';

import { ImagePlus, Mic, Plus, X } from 'lucide-react';

import { useChatControllerContext } from '@/components/chat/chat-controller-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

export function ChatComposerForm() {
  const {
    isImageGenerationMode,
    input,
    isRecording,
    isSendDisabled,
    isSubmitting,
    isTranscribing,
    selectedImageAspectRatio,
    sendMessage,
    stopGeneration,
    toggleImageGenerationMode,
    toggleRecording,
    updateInput,
    updateSelectedImageAspectRatio,
  } = useChatControllerContext();

  return (
    <div className="flex flex-col gap-2">
      {isImageGenerationMode ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={toggleImageGenerationMode}
            disabled={isSubmitting}
          >
            <ImagePlus data-icon="inline-start" />
            Modo imagen
            <X data-icon="inline-end" />
          </Button>

          <label className="text-xs text-muted-foreground" htmlFor="image-aspect-ratio">
            Aspect ratio
          </label>
          <select
            id="image-aspect-ratio"
            value={selectedImageAspectRatio}
            onChange={(event) => {
              updateSelectedImageAspectRatio(
                event.target.value as '1:1' | '16:9' | '9:16' | 'auto'
              );
            }}
            className="h-7 rounded-4xl border border-border bg-background px-3 text-xs"
            disabled={isSubmitting}
          >
            <option value="auto">Auto</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
        </div>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon-sm" disabled={isSubmitting}>
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={toggleImageGenerationMode}>
              <ImagePlus />
              <span>Generar imágenes</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant={isRecording ? 'destructive' : 'outline'}
          size="icon-sm"
          disabled={isSubmitting || isTranscribing}
          onClick={() => {
            void toggleRecording();
          }}
          aria-label={isRecording ? 'Detener dictado' : 'Iniciar dictado'}
        >
          <Mic />
        </Button>

        <Textarea
          name="message"
          placeholder={
            isImageGenerationMode ? 'Describe la imagen a generar...' : 'Send a message...'
          }
          value={input}
          onChange={(event) => {
            updateInput(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          disabled={isSubmitting}
          rows={1}
        />

        <Button
          type={isSubmitting ? 'button' : 'submit'}
          variant={isSubmitting ? 'destructive' : 'default'}
          disabled={isSubmitting ? false : isSendDisabled}
          onClick={() => {
            if (isSubmitting) {
              stopGeneration();
            }
          }}
        >
          {isSubmitting ? 'Stop' : isImageGenerationMode ? 'Generar' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
