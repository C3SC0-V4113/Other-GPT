import type { ReactNode } from 'react';

interface ComposerActionsRowProps {
  children: ReactNode;
}

export function ComposerActionsRow({ children }: ComposerActionsRowProps) {
  return <div className="flex w-full items-end gap-3">{children}</div>;
}
