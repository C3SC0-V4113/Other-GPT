import { Send, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ComposerSubmitButtonProps {
  isImageGenerationMode: boolean;
  isSendDisabled: boolean;
  isSubmitting: boolean;
  onSend: () => void;
  onStop: () => void;
}

export function ComposerSubmitButton({
  isImageGenerationMode,
  isSendDisabled,
  isSubmitting,
  onSend,
  onStop,
}: ComposerSubmitButtonProps) {
  const actionLabel = isSubmitting
    ? 'Detener generacion'
    : isImageGenerationMode
      ? 'Generar imagen'
      : 'Enviar mensaje';

  if (isSubmitting) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={actionLabel}
            className="shadow-sm"
            onClick={onStop}
            size="icon-sm"
            type="button"
            variant="destructive"
          >
            <Square />
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{actionLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={actionLabel}
          className="shadow-sm"
          disabled={isSendDisabled}
          onClick={onSend}
          size="icon-sm"
          type="button"
          variant="default"
        >
          <Send />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{actionLabel}</TooltipContent>
    </Tooltip>
  );
}
