import { Mic } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ComposerMicButtonProps {
  isRecording: boolean;
  isSubmitting: boolean;
  isTranscribing: boolean;
  onToggleRecording: () => Promise<void>;
}

export function ComposerMicButton({
  isRecording,
  isSubmitting,
  isTranscribing,
  onToggleRecording,
}: ComposerMicButtonProps) {
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
