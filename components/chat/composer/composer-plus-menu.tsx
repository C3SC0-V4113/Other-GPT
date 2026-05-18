import { ImagePlus, Paperclip, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ComposerPlusMenuProps {
  onAddAttachments: () => void;
  isSubmitting: boolean;
  onToggleImageMode: () => void;
}

export function ComposerPlusMenu({
  isSubmitting,
  onAddAttachments,
  onToggleImageMode,
}: ComposerPlusMenuProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isSubmitting} size="icon-sm" type="button" variant="outline">
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onAddAttachments}>
              <Paperclip />
              <span>Adjuntar archivos</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleImageMode}>
              <ImagePlus />
              <span>Generar imagenes</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>Opciones del composer</TooltipContent>
    </Tooltip>
  );
}
