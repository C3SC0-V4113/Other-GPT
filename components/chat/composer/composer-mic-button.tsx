import { Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('composer.mic');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={isRecording ? t('stop') : t('start')}
          disabled={isSubmitting || isTranscribing}
          className="shadow-sm"
          onClick={() => {
            void onToggleRecording();
          }}
          size="icon-sm"
          type="button"
          variant={isRecording ? 'destructive' : 'secondary'}
        >
          <Mic />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{isRecording ? t('stop') : t('start')}</TooltipContent>
    </Tooltip>
  );
}
