import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useChatVoiceActions } from '@/components/chat/chat-controller-provider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function VoiceActivityIndicator({ isActive }: { isActive: boolean }) {
  return (
    <span aria-hidden className="flex items-end gap-0.5">
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className={cn(
            'w-1 rounded-full bg-primary',
            isActive ? 'h-4 animate-pulse motion-reduce:animate-none' : 'h-2'
          )}
          style={{ animationDelay: `${bar * 150}ms` }}
        />
      ))}
    </span>
  );
}

export function ComposerVoicePanel() {
  const t = useTranslations('composer.voice');
  const { isAssistantSpeaking, isMuted, status, stopVoiceSession, toggleMute } =
    useChatVoiceActions();

  const isVisible = status !== 'idle';
  const isConnected = status === 'connected';

  const statusLabel =
    status === 'connecting'
      ? t('statusConnecting')
      : status === 'error'
        ? t('statusError')
        : isAssistantSpeaking
          ? t('speaking')
          : t('listening');

  const muteLabel = isMuted ? t('unmute') : t('mute');

  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={cn(
        'overflow-hidden transition-[max-height,margin,opacity,transform] duration-200 [transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none',
        isVisible
          ? 'mb-1 max-h-24 translate-y-0 opacity-100'
          : 'pointer-events-none mb-0 max-h-0 -translate-y-1 opacity-0'
      )}
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <VoiceActivityIndicator isActive={isConnected && isAssistantSpeaking} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{t('title')}</span>
            <span className="truncate text-xs text-muted-foreground">{statusLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={muteLabel}
                disabled={!isConnected}
                onClick={toggleMute}
                size="icon-sm"
                type="button"
                variant={isMuted ? 'destructive' : 'outline'}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{muteLabel}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t('endCall')}
                onClick={stopVoiceSession}
                size="icon-sm"
                type="button"
                variant="destructive"
              >
                <PhoneOff />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{t('endCall')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
