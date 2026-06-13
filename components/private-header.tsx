import { Stone } from 'lucide-react';

import type { ReactNode } from 'react';

interface PrivateHeaderProps {
  action: ReactNode;
}

export function PrivateHeader({ action }: PrivateHeaderProps) {
  return (
    <header className="border-b bg-background/95">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Stone />
          <h1 className="text-base font-semibold tracking-tight">otro-GPT</h1>
        </div>

        {action}
      </div>
    </header>
  );
}
