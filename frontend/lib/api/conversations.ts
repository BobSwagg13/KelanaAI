import { apiClient } from './client';

export interface ConversationSummary {
  id: number;
  user_id: number;
  /** null until the first exchange, when the model names it. */
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface MessageSource {
  document: string;
  snippet: string;
  /** Retrieval relevance (0-1), or null if the KB didn't return one. */
  score: number | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Passages an assistant answer was grounded in; null for user messages. */
  sources: MessageSource[] | null;
  created_at: string | null;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}

export interface PostMessageResult {
  conversation: ConversationSummary;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export const conversationsApi = {
  list: async (): Promise<ConversationSummary[]> => {
    const res = await apiClient.get<ConversationSummary[]>('/api/v1/conversations');
    return res.data;
  },

  create: async (): Promise<ConversationDetail> => {
    const res = await apiClient.post<ConversationDetail>('/api/v1/conversations');
    return res.data;
  },

  get: async (id: number): Promise<ConversationDetail> => {
    const res = await apiClient.get<ConversationDetail>(`/api/v1/conversations/${id}`);
    return res.data;
  },

  /**
   * Add a user message and get the grounded reply. One-shot per call; the
   * server assembles prompt history from the stored messages.
   */
  sendMessage: async (id: number, content: string): Promise<PostMessageResult> => {
    const res = await apiClient.post<PostMessageResult>(
      `/api/v1/conversations/${id}/messages`,
      { content }
    );
    return res.data;
  },

  rename: async (id: number, title: string): Promise<ConversationSummary> => {
    const res = await apiClient.patch<ConversationSummary>(`/api/v1/conversations/${id}`, {
      title,
    });
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/conversations/${id}`);
  },
};
