'use client';

import { Check, Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ThemeMode = 'dark' | 'light' | 'system';

const themeModes: Array<{
  icon: typeof Sun;
  label: string;
  value: ThemeMode;
}> = [
  { icon: Laptop, label: 'System', value: 'system' },
  { icon: Sun, label: 'Light', value: 'light' },
  { icon: Moon, label: 'Dark', value: 'dark' },
];

export function ThemeModeSelector() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isDarkTheme = isMounted && resolvedTheme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Cambiar apariencia"
          className="relative shadow-sm"
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <span aria-hidden="true" className="relative size-4">
            <Sun
              className={cn(
                'absolute inset-0 transition-[opacity,transform] duration-180 [transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none',
                isDarkTheme ? 'scale-75 rotate-45 opacity-0' : 'scale-100 rotate-0 opacity-100'
              )}
            />
            <Moon
              className={cn(
                'absolute inset-0 transition-[opacity,transform] duration-150 [transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none',
                isDarkTheme ? 'scale-100 rotate-0 opacity-100' : 'scale-75 -rotate-45 opacity-0'
              )}
            />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeModes.map((mode) => {
          const ModeIcon = mode.icon;
          const isActive = isMounted && theme === mode.value;

          return (
            <DropdownMenuItem
              key={mode.value}
              onClick={() => {
                setTheme(mode.value);
              }}
            >
              <ModeIcon />
              <span>{mode.label}</span>
              {isActive ? <Check className="ml-auto" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
