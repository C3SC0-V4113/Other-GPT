'use client';

import { ImagePlus, Mic, Plus, Send, Square, X } from 'lucide-react';

import { useChatComposer } from '@/components/chat/chat-composer-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

function ComposerRoot({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

function ComposerToolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
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

function ComposerActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-end gap-2">{children}</div>;
}

const aspectRatioOptions: Array<{ label: string; value: ChatImageAspectRatio }> = [
  { label: 'Auto', value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
];

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
          <Badge variant="secondary" className="gap-1.5">
            <ImagePlus data-icon="inline-start" />
            Modo imagen
            <button
              aria-label="Desactivar modo imagen"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={toggleImageGenerationMode}
              type="button"
            >
              <X />
            </button>
          </Badge>

          <Separator className="h-5" orientation="vertical" />

          <Select
            disabled={isSubmitting}
            onValueChange={(value) => {
              setSelectedImageAspectRatio(value as ChatImageAspectRatio);
            }}
            value={selectedImageAspectRatio}
          >
            <SelectTrigger aria-label="Seleccionar aspect ratio" size="sm">
              <SelectValue placeholder="Aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {aspectRatioOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </ComposerToolbar>
      ) : null}

      <ComposerActions>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isSubmitting} size="icon-sm" type="button" variant="outline">
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
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>Opciones del composer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={isRecording ? 'Detener dictado' : 'Iniciar dictado'}
              disabled={isSubmitting || isTranscribing}
              onClick={() => {
                void toggleRecording();
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

        {isSubmitting ? (
          <Button onClick={stopGeneration} type="button" variant="destructive">
            <Square data-icon="inline-start" />
            Stop
          </Button>
        ) : (
          <Button
            disabled={isSendDisabled}
            onClick={() => {
              void sendMessage();
            }}
            type="button"
            variant="default"
          >
            <Send data-icon="inline-start" />
            {isImageGenerationMode ? 'Generar' : 'Enviar'}
          </Button>
        )}
      </ComposerActions>
    </ComposerRoot>
  );
}
