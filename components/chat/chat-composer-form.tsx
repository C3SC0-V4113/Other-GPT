'use client';

import { useChatControllerContext } from '@/components/chat/chat-controller-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatComposerForm() {
  const { input, isSendDisabled, isSubmitting, sendMessage, stopGeneration, updateInput } =
    useChatControllerContext();

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void sendMessage();
      }}
    >
      <Textarea
        name="message"
        placeholder="Send a message..."
        value={input}
        onChange={(event) => {
          updateInput(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void sendMessage();
          }
        }}
        disabled={isSubmitting}
        rows={1}
      />
      <Button
        type={isSubmitting ? 'button' : 'submit'}
        variant={isSubmitting ? 'destructive' : 'default'}
        disabled={isSubmitting ? false : isSendDisabled}
        onClick={() => {
          if (isSubmitting) {
            stopGeneration();
          }
        }}
      >
        {isSubmitting ? 'Stop' : 'Send'}
      </Button>
    </form>
  );
}
