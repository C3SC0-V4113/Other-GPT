import type { ReactNode } from 'react';

interface ComposerActionsRowProps {
  children: ReactNode;
}

export function ComposerActionsRow({ children }: ComposerActionsRowProps) {
  return <div className="flex items-end gap-2">{children}</div>;
}
