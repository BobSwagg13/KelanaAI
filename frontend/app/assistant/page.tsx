'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ConversationSidebar } from '@/components/assistant/ConversationSidebar';
import { ChatPanel } from '@/components/assistant/ChatPanel';
import {
  conversationsApi,
  type ChatMessage,
  type ConversationDetail,
  type ConversationSummary,
} from '@/lib/api/conversations';
import { conversationKeys } from '@/lib/queries/keys';
import { createAppError, type AppError } from '@/lib/types/errors';
import { cn } from '@/lib/utils/cn';

const EMPTY: ConversationSummary[] = [];

function moveToFront(
  list: ConversationSummary[],
  summary: ConversationSummary
): ConversationSummary[] {
  return [summary, ...list.filter((c) => c.id !== summary.id)];
}

function AssistantContent() {
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  // Every mutation guards on one of these. Without them, spam-clicking "New
  // chat" fired one POST per click and they all landed at once; a repeat Delete
  // hit an already-deleted row and surfaced a bogus 404 banner.
  const [creating, setCreating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [mutationError, setMutationError] = useState<AppError | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const listQuery = useQuery({
    queryKey: conversationKeys.list(),
    queryFn: conversationsApi.list,
  });
  const conversations = listQuery.data ?? EMPTY;

  /**
   * Which conversation the chat panel shows.
   *
   * Derived rather than stored, so the newest conversation is selected on first
   * load without a state-setting effect — and deleting the active one falls
   * back to the next most recent for free.
   */
  const effectiveId = activeId ?? conversations[0]?.id ?? null;

  /**
   * One cache entry per conversation. Because each has its own key, an
   * out-of-order response can no longer paint the wrong thread — React Query
   * only ever renders the active key, which is what the hand-rolled request
   * sequence guard used to do.
   */
  const detailQuery = useQuery({
    queryKey: conversationKeys.detail(effectiveId ?? 0),
    queryFn: () => conversationsApi.get(effectiveId as number),
    enabled: effectiveId !== null,
  });
  const detail = effectiveId === null ? null : (detailQuery.data ?? null);

  const queryError = listQuery.error ?? detailQuery.error;
  const error = mutationError ?? (queryError ? createAppError(queryError) : null);

  const clearPending = (id: number) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const setList = (
    update: (prev: ConversationSummary[]) => ConversationSummary[]
  ) =>
    queryClient.setQueryData<ConversationSummary[]>(conversationKeys.list(), (prev) =>
      update(prev ?? [])
    );

  const setDetail = (
    id: number,
    update: (prev: ConversationDetail) => ConversationDetail
  ) =>
    queryClient.setQueryData<ConversationDetail>(conversationKeys.detail(id), (prev) =>
      prev ? update(prev) : prev
    );

  const selectConversation = (id: number) => {
    setActiveId(id);
    setMutationError(null);
    setMobileView('chat');
  };

  const newChat = () => {
    if (creating) return;
    setMutationError(null);
    setCreating(true);
    conversationsApi
      .create()
      .then((created) => {
        setList((prev) => [created, ...prev]);
        queryClient.setQueryData(conversationKeys.detail(created.id), created);
        setActiveId(created.id);
        setMobileView('chat');
      })
      .catch((err) => setMutationError(createAppError(err)))
      .finally(() => setCreating(false));
  };

  const send = async (content: string) => {
    if (sending) return;
    setMutationError(null);
    setSending(true);

    let conversationId = effectiveId;
    try {
      if (conversationId === null) {
        const created = await conversationsApi.create();
        setList((prev) => [created, ...prev]);
        queryClient.setQueryData(conversationKeys.detail(created.id), created);
        setActiveId(created.id);
        setMobileView('chat');
        conversationId = created.id;
      }

      const optimistic: ChatMessage = {
        id: -Date.now(),
        conversation_id: conversationId,
        role: 'user',
        content,
        sources: null,
        created_at: new Date().toISOString(),
      };
      setDetail(conversationId, (d) => ({ ...d, messages: [...d.messages, optimistic] }));

      const result = await conversationsApi.sendMessage(conversationId, content);

      setDetail(conversationId, (d) => ({
        ...d,
        ...result.conversation,
        messages: [
          ...d.messages.filter((m) => m.id !== optimistic.id),
          result.user_message,
          result.assistant_message,
        ],
      }));
      setList((prev) => moveToFront(prev, result.conversation));
    } catch (err) {
      // Roll the optimistic user bubble back out (its id is negative).
      if (conversationId !== null) {
        setDetail(conversationId, (d) => ({
          ...d,
          messages: d.messages.filter((m) => m.id >= 0),
        }));
      }
      setMutationError(createAppError(err));
    } finally {
      setSending(false);
    }
  };

  const renameConversation = (id: number, title: string) => {
    if (pendingIds.has(id)) return;
    setPendingIds((prev) => new Set(prev).add(id));
    conversationsApi
      .rename(id, title)
      .then((updated) => {
        setList((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
        setDetail(id, (d) => ({ ...d, ...updated }));
      })
      .catch((err) => setMutationError(createAppError(err)))
      .finally(() => clearPending(id));
  };

  const deleteConversation = (id: number) => {
    if (pendingIds.has(id)) return;
    setMutationError(null);
    setPendingIds((prev) => new Set(prev).add(id));

    // Drop the row immediately so it cannot be clicked a second time. The whole
    // previous list is kept so a failure restores the original order exactly.
    const previous =
      queryClient.getQueryData<ConversationSummary[]>(conversationKeys.list()) ?? [];
    setList((prev) => prev.filter((c) => c.id !== id));

    conversationsApi
      .remove(id)
      .then(() => {
        queryClient.removeQueries({ queryKey: conversationKeys.detail(id) });
        if (activeId === id) {
          setActiveId(null);
          setMobileView('list');
        }
      })
      .catch((err) => {
        queryClient.setQueryData(conversationKeys.list(), previous);
        setMutationError(createAppError(err));
      })
      .finally(() => clearPending(id));
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl overflow-hidden border-x border-brand-border">
      <aside
        className={cn(
          'w-full shrink-0 border-r border-brand-border md:block md:w-72',
          mobileView === 'list' ? 'block' : 'hidden'
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          activeId={effectiveId}
          busy={listQuery.isLoading || creating}
          pendingIds={pendingIds}
          onSelect={selectConversation}
          onNew={newChat}
          onRename={renameConversation}
          onDelete={deleteConversation}
        />
      </aside>

      <main
        className={cn(
          'min-w-0 flex-1',
          mobileView === 'chat' ? 'block' : 'hidden md:block'
        )}
      >
        <ChatPanel
          conversation={detail}
          loading={detailQuery.isLoading}
          sending={sending}
          error={error}
          onSend={send}
          onDismissError={() => setMutationError(null)}
          onBack={() => setMobileView('list')}
        />
      </main>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <RequireAuth>
      <AssistantContent />
    </RequireAuth>
  );
}
