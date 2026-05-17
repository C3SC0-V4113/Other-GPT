import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

const aspectRatioOptions: Array<{ label: string; value: ChatImageAspectRatio }> = [
  { label: 'Auto', value: 'auto' },
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
  return (
    <Select disabled={isDisabled} onValueChange={onValueChange} value={value}>
      <SelectTrigger aria-label="Seleccionar aspect ratio" size="sm">
        <SelectValue placeholder="Aspect ratio" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {aspectRatioOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
