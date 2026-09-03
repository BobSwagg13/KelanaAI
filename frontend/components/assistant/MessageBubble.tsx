'use client';

import { format, isToday } from 'date-fns';
import { FileText } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/lib/api/conversations';
import { cn } from '@/lib/utils/cn';

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'MMM d, HH:mm');
}

// Assistant answers come back as Markdown from Bedrock. Mapped to Tailwind here
// because the project has no typography plugin.
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-primary underline"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-bold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-brand-border pl-3 text-brand-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-brand-border" />,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-brand-surface-subtle p-3 font-mono text-xs last:mb-0">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code
      className={cn(
        'font-mono',
        !className?.includes('language-') &&
          'rounded bg-brand-surface-subtle px-1 py-0.5 text-[0.85em]'
      )}
    >
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-brand-border px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-brand-border px-2 py-1 align-top">{children}</td>
  ),
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const timestamp = formatTimestamp(message.created_at);

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'whitespace-pre-wrap rounded-br-md text-white'
            : 'rounded-bl-md border border-brand-border bg-white text-brand-ink'
        )}
        style={isUser ? { background: 'var(--brand-primary)' } : undefined}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {!isUser && message.sources && message.sources.length > 0 && (
        <details className="max-w-[85%] text-xs">
          <summary className="cursor-pointer text-brand-muted hover:text-brand-primary">
            Sources ({message.sources.length})
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {message.sources.map((source, i) => (
              <div
                key={`${source.document}-${i}`}
                className="rounded-lg border border-brand-border bg-brand-surface-subtle p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <FileText
                    size={13}
                    style={{ color: 'var(--brand-primary)' }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-brand-ink break-all">{source.document}</span>
                  {typeof source.score === 'number' && (
                    <span className="ml-auto shrink-0 text-brand-muted">
                      {source.score.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="mt-1 leading-relaxed text-brand-muted">{source.snippet}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {timestamp && (
        <span className="px-1 text-[11px] text-brand-muted" title={message.created_at ?? undefined}>
          {timestamp}
        </span>
      )}
    </div>
  );
}

/** The animated "assistant is typing" placeholder bubble. */
export function TypingBubble() {
  return (
    <div className="flex items-start">
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-brand-border bg-white px-4 py-3"
        role="status"
        aria-label="Assistant is typing"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-muted"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
