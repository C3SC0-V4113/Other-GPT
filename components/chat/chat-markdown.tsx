import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

interface ChatMarkdownProps {
  content: string;
}

const markdownComponents: Components = {
  a: ({ className, ...props }) => (
    <a
      className={cn('font-medium underline underline-offset-4 hover:opacity-80', className)}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn('rounded-sm bg-muted/60 px-1 py-0.5 font-mono text-[0.8125rem]', className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        'overflow-x-auto rounded-lg border border-border/70 bg-muted/40 p-3 leading-relaxed [&>code]:bg-transparent [&>code]:p-0',
        className
      )}
      {...props}
    />
  ),
};

const remarkPlugins = [remarkGfm];

export const ChatMarkdown = memo(function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="space-y-3 text-sm leading-relaxed break-words [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-3 [&_hr]:border-border [&_li>input[type='checkbox']]:mr-2 [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:my-3 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc">
      <ReactMarkdown components={markdownComponents} remarkPlugins={remarkPlugins} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
});
