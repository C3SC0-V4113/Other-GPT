import { ImagePlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ComposerModeBadgeProps {
  onRemove: () => void;
}

export function ComposerModeBadge({ onRemove }: ComposerModeBadgeProps) {
  return (
    <Button
      aria-label="Desactivar modo imagen"
      className="h-8 gap-2 rounded-3xl pr-2.5 shadow-sm"
      onClick={onRemove}
      type="button"
      variant="secondary"
    >
      <ImagePlus data-icon="inline-start" />
      <span className="text-sm">Modo imagen</span>
      <span aria-hidden="true" className="rounded-full bg-background/70 p-1">
        <X className="size-3.5" />
      </span>
    </Button>
  );
}
