import { AudioLines } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useChatVoiceActions } from '@/components/chat/chat-controller-provider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ComposerVoiceButtonProps {
  isSubmitting: boolean;
}

export function ComposerVoiceButton({ isSubmitting }: ComposerVoiceButtonProps) {
  const t = useTranslations('composer.voice');
  const { startVoiceSession, status, stopVoiceSession } = useChatVoiceActions();

  const isActive = status === 'connected' || status === 'connecting';
  const label = isActive ? t('stop') : t('start');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="shadow-sm"
          disabled={isSubmitting}
          onClick={() => {
            if (isActive) {
              stopVoiceSession();
              return;
            }

            void startVoiceSession();
          }}
          size="icon-sm"
          type="button"
          variant={isActive ? 'destructive' : 'secondary'}
        >
          <AudioLines />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
