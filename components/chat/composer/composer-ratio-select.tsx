import { useTranslations } from 'next-intl';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

const aspectRatioOptions: Array<{ label: string | null; value: ChatImageAspectRatio }> = [
  { label: null, value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
];

interface ComposerRatioSelectProps {
  isDisabled: boolean;
  onValueChange: (value: ChatImageAspectRatio) => void;
  value: ChatImageAspectRatio;
}

export function ComposerRatioSelect({
  isDisabled,
  onValueChange,
  value,
}: ComposerRatioSelectProps) {
  const t = useTranslations('composer.ratio');

  return (
    <Select disabled={isDisabled} onValueChange={onValueChange} value={value}>
      <SelectTrigger aria-label={t('ariaLabel')} size="sm">
        <SelectValue placeholder={t('placeholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {aspectRatioOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label ?? t('auto')}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
