import type { ReactNode } from 'react';

interface ComposerToolbarProps {
  children: ReactNode;
}

export function ComposerToolbar({ children }: ComposerToolbarProps) {
  return <div className="flex min-h-9 items-center gap-2.5">{children}</div>;
}
