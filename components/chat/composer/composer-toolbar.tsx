import type { ReactNode } from 'react';

interface ComposerToolbarProps {
  children: ReactNode;
}

export function ComposerToolbar({ children }: ComposerToolbarProps) {
  return <div className="flex items-center gap-2">{children}</div>;
}
