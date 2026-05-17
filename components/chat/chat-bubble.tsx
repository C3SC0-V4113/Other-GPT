import { cva } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChatBubbleRole = 'assistant' | 'system' | 'user';
type ChatBubbleState = 'complete' | 'error' | 'interrupted' | 'streaming';

const chatBubbleRootVariants = cva(
  'max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
  {
    variants: {
      role: {
        user: 'ml-auto border-transparent bg-primary text-primary-foreground',
        assistant: 'mr-auto border-border bg-card text-card-foreground',
        system: 'mr-auto border-border bg-muted/30 text-foreground',
      },
      state: {
        complete: '',
        streaming: '',
        interrupted: '',
        error: 'border-destructive/40 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: {
      role: 'assistant',
      state: 'complete',
    },
  }
);

function ChatBubbleRoot({
  className,
  role = 'assistant',
  state = 'complete',
  ...props
}: ComponentProps<'article'> & {
  role?: ChatBubbleRole;
  state?: ChatBubbleState;
}) {
  return (
    <article
      data-slot="chat-bubble-root"
      data-role={role}
      data-state={state}
      className={cn(chatBubbleRootVariants({ role, state }), className)}
      {...props}
    />
  );
}

function ChatBubbleHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="chat-bubble-header"
      className={cn('mb-1 text-xs font-medium tracking-wide opacity-80', className)}
      {...props}
    />
  );
}

function ChatBubbleBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="chat-bubble-body" className={cn('whitespace-pre-wrap', className)} {...props} />
  );
}

function ChatBubbleFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="chat-bubble-footer"
      className={cn('mt-2 flex items-center justify-between gap-2 text-xs opacity-90', className)}
      {...props}
    />
  );
}

function ChatBubbleActions({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="chat-bubble-actions"
      className={cn('ml-auto flex items-center gap-2', className)}
      {...props}
    />
  );
}

function ChatBubbleAction({
  className,
  variant = 'ghost',
  size = 'xs',
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="chat-bubble-action"
      variant={variant}
      size={size}
      className={className}
      {...props}
    />
  );
}

export {
  ChatBubbleAction as Action,
  ChatBubbleActions as Actions,
  ChatBubbleBody as Body,
  ChatBubbleFooter as Footer,
  ChatBubbleHeader as Header,
  ChatBubbleRoot as Root,
};
