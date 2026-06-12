'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * On `lg+` viewports, redirect the Settings index to a default section so the
 * two-pane never shows an empty content panel. On mobile it does nothing (the
 * shell shows the section list instead).
 */
export function DesktopRedirect({ to }: { to: string }) {
  const { replace } = useRouter();

  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      replace(to);
    }
  }, [replace, to]);

  return null;
}
