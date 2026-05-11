import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

import type { ChatRole } from '@/lib/chat-session-store';
import type { ComponentProps } from 'react';

const chatMessageBubbleVariants = cva(
  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
  {
    variants: {
      role: {
        user: 'ml-auto bg-primary text-primary-foreground',
        assistant: 'mr-auto border border-border bg-card text-card-foreground',
      },
    },
    defaultVariants: {
      role: 'assistant',
    },
  }
);

interface ChatMessageBubbleProps extends ComponentProps<'article'> {
  role: ChatRole;
}

export function ChatMessageBubble({ className, role, ...props }: ChatMessageBubbleProps) {
  return (
    <article
      data-slot="chat-message-bubble"
      data-role={role}
      className={cn(chatMessageBubbleVariants({ role }), className)}
      {...props}
    />
  );
}
