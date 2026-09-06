'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { ConversationSummary } from '@/lib/api/conversations';
import { cn } from '@/lib/utils/cn';

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeId: number | null;
  busy?: boolean;
  /** Rows with a rename or delete in flight; their controls are disabled. */
  pendingIds?: Set<number>;
  onSelect: (id: number) => void;
  onNew: () => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}

const NO_PENDING: Set<number> = new Set();

export function ConversationSidebar({
  conversations,
  activeId,
  busy,
  pendingIds = NO_PENDING,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const startEditing = (conversation: ConversationSummary) => {
    setConfirmingId(null);
    setEditingId(conversation.id);
    setEditValue(conversation.title ?? '');
  };

  const commitEditing = () => {
    const trimmed = editValue.trim();
    if (editingId !== null && trimmed) onRename(editingId, trimmed);
    setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          disabled={busy}
          data-testid="assistant-new-chat"
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Plus size={16} aria-hidden="true" />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-brand-muted">
            No conversations yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeId;
              const isEditing = conversation.id === editingId;
              const isConfirming = conversation.id === confirmingId;
              const isPending = pendingIds.has(conversation.id);

              return (
                <li key={conversation.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors',
                      isActive ? 'bg-brand-surface-subtle' : 'hover:bg-brand-surface-subtle'
                    )}
                  >
                    {isEditing ? (
                      <>
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEditing();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          maxLength={256}
                          className="min-w-0 flex-1 rounded border border-brand-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                        <button
                          type="button"
                          onClick={commitEditing}
                          aria-label="Save title"
                          className="shrink-0 rounded p-1 text-brand-muted hover:text-brand-primary"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel"
                          className="shrink-0 rounded p-1 text-brand-muted hover:text-brand-ink"
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : isConfirming ? (
                      <>
                        <span className="min-w-0 flex-1 truncate text-brand-muted">Delete this chat?</span>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            onDelete(conversation.id);
                            setConfirmingId(null);
                          }}
                          className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-brand-muted hover:bg-brand-surface-subtle"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelect(conversation.id)}
                          className="min-w-0 flex-1 text-left focus-visible:outline-none"
                        >
                          <span
                            className={cn(
                              'block truncate',
                              isActive ? 'font-semibold text-brand-ink' : 'text-brand-ink'
                            )}
                          >
                            {conversation.title ?? 'New chat'}
                          </span>
                          <span className="block truncate text-xs text-brand-muted">
                            {relativeTime(conversation.updated_at)}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => startEditing(conversation)}
                          aria-label="Rename conversation"
                          className="shrink-0 rounded p-1 text-brand-muted opacity-0 transition-opacity hover:text-brand-primary focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setEditingId(null);
                            setConfirmingId(conversation.id);
                          }}
                          aria-label="Delete conversation"
                          className="shrink-0 rounded p-1 text-brand-muted opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
