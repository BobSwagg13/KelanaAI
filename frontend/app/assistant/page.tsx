'use client';

import { useState } from 'react';
import { Sparkles, FileText, Send } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { assistantApi, type AskResponse } from '@/lib/api/assistant';
import { createAppError, type AppError } from '@/lib/types/errors';

const MIN_LENGTH = 3;
const MAX_LENGTH = 500;

const EXAMPLES = [
  'Do Indonesian travellers need a visa to visit Japan?',
  'How does cross-border QRIS payment work for Indonesians abroad?',
  'What is the duty-free allowance and IMEI limit for bringing a phone into Indonesia?',
  "What's a backpacker's daily budget for Kyoto?",
];

function AssistantContent() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const submit = async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length < MIN_LENGTH || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await assistantApi.ask(trimmed));
    } catch (err) {
      setError(createAppError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span
          className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Sparkles size={14} aria-hidden="true" /> Knowledge base
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-ink">
          Travel assistant
        </h1>
        <p className="text-brand-muted">
          Ask a travel question and get an answer grounded in KelanaAI&apos;s document
          library, along with the passages it used. Answers come only from those
          documents.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(question);
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="assistant-question" className="sr-only">
          Your question
        </label>
        <textarea
          id="assistant-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit(question);
            }
          }}
          rows={3}
          maxLength={MAX_LENGTH}
          placeholder="e.g. Do I need a visa to visit Japan?"
          className="w-full resize-y rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-brand-muted">
            {question.length}/{MAX_LENGTH} &middot; &#8984;/Ctrl + Enter to send
          </span>
          <Button type="submit" loading={loading} disabled={question.trim().length < MIN_LENGTH}>
            <Send size={16} aria-hidden="true" />
            Ask
          </Button>
        </div>
      </form>

      {!result && !loading && !error && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-brand-ink">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuestion(example);
                  void submit(example);
                }}
                className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-left text-xs text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <ErrorDisplay
          error={error}
          onRetry={error.retryable ? () => void submit(question) : undefined}
          onDismiss={() => setError(null)}
        />
      )}

      {loading && (
        <Card>
          <p className="text-sm text-brand-muted">Searching the knowledge base&hellip;</p>
        </Card>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Question
            </p>
            <p className="font-medium text-brand-ink">{result.question}</p>
            <hr className="border-brand-border" />
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Answer
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">
              {result.answer}
            </p>
          </Card>

          {result.sources.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-brand-ink">
                Sources ({result.sources.length})
              </p>
              {result.sources.map((source, i) => (
                <Card key={`${source.document}-${i}`} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={15}
                      style={{ color: 'var(--brand-primary)' }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-brand-ink break-all">
                      {source.document}
                    </span>
                    {typeof source.score === 'number' && (
                      <span className="ml-auto shrink-0 text-xs text-brand-muted">
                        match {source.score.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-brand-muted">{source.snippet}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function AssistantPage() {
  return (
    <RequireAuth>
      <AssistantContent />
    </RequireAuth>
  );
}
