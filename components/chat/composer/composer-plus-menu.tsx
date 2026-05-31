import { FolderOpen, ImagePlus, Paperclip, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  totalAttachmentCount: number;
  onOpenAttachmentsContext: () => void;
  onAddAttachments: () => void;
  isSubmitting: boolean;
  onToggleImageMode: () => void;
}

export function ComposerPlusMenu({
  contextAttachmentCount,
  totalAttachmentCount,
  onOpenAttachmentsContext,
  isSubmitting,
  onAddAttachments,
  onToggleImageMode,
}: ComposerPlusMenuProps) {
  const t = useTranslations('composer.plusMenu');

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
              <span>{t('contextFiles')}</span>
              <Badge className="ml-auto" variant="secondary">
                {contextAttachmentCount}/{totalAttachmentCount}
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddAttachments}>
              <Paperclip />
              <span>{t('attachFiles')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleImageMode}>
              <ImagePlus />
              <span>{t('generateImages')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{t('options')}</TooltipContent>
    </Tooltip>
  );
}
