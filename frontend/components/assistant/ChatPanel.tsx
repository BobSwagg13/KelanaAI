'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import type { ConversationDetail } from '@/lib/api/conversations';
import type { AppError } from '@/lib/types/errors';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { MessageBubble, TypingBubble } from './MessageBubble';

const MAX_LENGTH = 4000;

const EXAMPLES = [
  'Do Indonesian travellers need a visa to visit Japan?',
  'How does cross-border QRIS payment work for Indonesians abroad?',
  'Duty-free allowance and IMEI limit for bringing a phone into Indonesia?',
  "What's a backpacker's daily budget for Kyoto?",
];

interface ChatPanelProps {
  conversation: ConversationDetail | null;
  loading: boolean;
  sending: boolean;
  error: AppError | null;
  onSend: (content: string) => void;
  onDismissError: () => void;
  onBack: () => void;
}

export function ChatPanel({
  conversation,
  loading,
  sending,
  error,
  onSend,
  onDismissError,
  onBack,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastConversationId = useRef<number | null>(null);

  const messages = conversation?.messages ?? [];

  // Scroll the message list itself (not the page) to the newest message:
  // instantly when a conversation is first opened, smoothly when a message is
  // sent or the typing bubble appears.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const switched = conversation?.id !== lastConversationId.current;
    lastConversationId.current = conversation?.id ?? null;
    el.scrollTo({ top: el.scrollHeight, behavior: switched ? 'auto' : 'smooth' });
  }, [conversation?.id, messages.length, sending]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setDraft('');
  };

  if (loading) {
    return <LoadingState stage="loading" message="Loading conversation..." />;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-brand-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-lg p-1.5 text-brand-muted hover:text-brand-primary md:hidden"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="truncate font-display text-lg font-bold tracking-tight text-brand-ink">
          {conversation?.title ?? 'New chat'}
        </h1>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.length === 0 && !sending ? (
            <div className="flex flex-col gap-4 pt-8 text-center">
              <p className="text-brand-muted">
                Ask a travel question. Answers are grounded in KelanaAI&apos;s document
                library, with the sources shown.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={sending}
                    onClick={() => onSend(example)}
                    className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}

          {sending && <TypingBubble />}
        </div>
      </div>

      <div className="border-t border-brand-border px-4 py-3">
        <div className="mx-auto max-w-2xl">
          {error && (
            <div className="mb-3">
              <ErrorDisplay
                error={error}
                onRetry={error.retryable ? submit : undefined}
                onDismiss={onDismissError}
              />
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              Your message
            </label>
            <textarea
              id="chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={MAX_LENGTH}
              placeholder="Ask about visas, customs, payments, Japan travel..."
              className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              style={{ background: 'var(--brand-gradient)' }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
