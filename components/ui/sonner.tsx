'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const toasterStyle: React.CSSProperties = {
  ['--border-radius' as string]: 'var(--radius)',
  ['--normal-bg' as string]: 'var(--popover)',
  ['--normal-border' as string]: 'var(--border)',
  ['--normal-text' as string]: 'var(--popover-foreground)',
};

function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      className="toaster group"
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      style={toasterStyle}
      theme={theme as ToasterProps['theme']}
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
