import { apiClient } from './client';

/** One retrieved passage the answer was grounded in. */
export interface AskSource {
  document: string;
  snippet: string;
  /** Retrieval relevance (0-1), or null if the KB didn't return one. */
  score: number | null;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: AskSource[];
}

export const assistantApi = {
  /**
   * Ask the knowledge-base assistant a one-shot travel question. No
   * conversation state is kept between calls. Requires a session.
   */
  ask: async (question: string): Promise<AskResponse> => {
    const response = await apiClient.post<AskResponse>('/api/v1/ask', { question });
    return response.data;
  },
};
