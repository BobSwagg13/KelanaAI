'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ConversationSidebar } from '@/components/assistant/ConversationSidebar';
import { ChatPanel } from '@/components/assistant/ChatPanel';
import {
  conversationsApi,
  type ChatMessage,
  type ConversationDetail,
  type ConversationSummary,
} from '@/lib/api/conversations';
import { createAppError, type AppError } from '@/lib/types/errors';
import { cn } from '@/lib/utils/cn';

function moveToFront(
  list: ConversationSummary[],
  summary: ConversationSummary
): ConversationSummary[] {
  return [summary, ...list.filter((c) => c.id !== summary.id)];
}

function AssistantContent() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  // Starts true: the list always loads once on mount.
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    let cancelled = false;
    conversationsApi
      .list()
      .then((list) => {
        if (cancelled) return undefined;
        setConversations(list);
        if (list.length === 0) return undefined;
        setActiveId(list[0].id);
        setLoadingDetail(true);
        return conversationsApi.get(list[0].id).then((loaded) => {
          if (!cancelled) setDetail(loaded);
        });
      })
      .catch((err) => {
        if (!cancelled) setError(createAppError(err));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingList(false);
          setLoadingDetail(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectConversation = (id: number) => {
    setActiveId(id);
    setError(null);
    setMobileView('chat');
    if (detail?.id === id) return;
    setDetail(null);
    setLoadingDetail(true);
    conversationsApi
      .get(id)
      .then(setDetail)
      .catch((err) => setError(createAppError(err)))
      .finally(() => setLoadingDetail(false));
  };

  const newChat = () => {
    setError(null);
    conversationsApi
      .create()
      .then((created) => {
        setConversations((prev) => [created, ...prev]);
        setActiveId(created.id);
        setDetail(created);
        setMobileView('chat');
      })
      .catch((err) => setError(createAppError(err)));
  };

  const send = async (content: string) => {
    if (sending) return;
    setError(null);
    setSending(true);

    let conversationId = activeId;
    try {
      if (conversationId === null) {
        const created = await conversationsApi.create();
        setConversations((prev) => [created, ...prev]);
        setActiveId(created.id);
        setDetail(created);
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
      setDetail((d) => (d ? { ...d, messages: [...d.messages, optimistic] } : d));

      const result = await conversationsApi.sendMessage(conversationId, content);

      setDetail((d) => {
        if (!d) return d;
        const kept = d.messages.filter((m) => m.id !== optimistic.id);
        return {
          ...d,
          ...result.conversation,
          messages: [...kept, result.user_message, result.assistant_message],
        };
      });
      setConversations((prev) => moveToFront(prev, result.conversation));
    } catch (err) {
      // Roll the optimistic user bubble back out (its id is negative).
      setDetail((d) =>
        d ? { ...d, messages: d.messages.filter((m) => m.id >= 0) } : d
      );
      setError(createAppError(err));
    } finally {
      setSending(false);
    }
  };

  const renameConversation = (id: number, title: string) => {
    conversationsApi
      .rename(id, title)
      .then((updated) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
        );
        setDetail((d) => (d && d.id === id ? { ...d, ...updated } : d));
      })
      .catch((err) => setError(createAppError(err)));
  };

  const deleteConversation = (id: number) => {
    conversationsApi
      .remove(id)
      .then(() => {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) {
          setActiveId(null);
          setDetail(null);
          setMobileView('list');
        }
      })
      .catch((err) => setError(createAppError(err)));
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
          activeId={activeId}
          busy={loadingList}
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
          loading={loadingDetail}
          sending={sending}
          error={error}
          onSend={send}
          onDismissError={() => setError(null)}
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
