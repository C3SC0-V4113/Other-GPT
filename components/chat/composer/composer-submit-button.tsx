import { Send, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
  if (isSubmitting) {
    return (
      <Button onClick={onStop} type="button" variant="destructive">
        <Square data-icon="inline-start" />
        Stop
      </Button>
    );
  }

  return (
    <Button disabled={isSendDisabled} onClick={onSend} type="button" variant="default">
      <Send data-icon="inline-start" />
      {isImageGenerationMode ? 'Generar' : 'Enviar'}
    </Button>
  );
}
