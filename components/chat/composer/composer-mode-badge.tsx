import { ImagePlus, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface ComposerModeBadgeProps {
  onRemove: () => void;
}

export function ComposerModeBadge({ onRemove }: ComposerModeBadgeProps) {
  return (
    <Badge className="gap-1.5" variant="secondary">
      <ImagePlus data-icon="inline-start" />
      Modo imagen
      <button
        aria-label="Desactivar modo imagen"
        className="rounded-full p-0.5 hover:bg-foreground/10"
        onClick={onRemove}
        type="button"
      >
        <X />
      </button>
    </Badge>
  );
}
