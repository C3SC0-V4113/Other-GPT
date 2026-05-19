import { FolderOpen, ImagePlus, Paperclip, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ComposerPlusMenuProps {
  contextAttachmentCount: number;
  onOpenAttachmentsContext: () => void;
  onAddAttachments: () => void;
  isSubmitting: boolean;
  onToggleImageMode: () => void;
}

export function ComposerPlusMenu({
  contextAttachmentCount,
  onOpenAttachmentsContext,
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
            <DropdownMenuItem onClick={onOpenAttachmentsContext}>
              <FolderOpen />
              <span>Archivos en contexto</span>
              <Badge className="ml-auto" variant="secondary">
                {contextAttachmentCount}
              </Badge>
            </DropdownMenuItem>
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
