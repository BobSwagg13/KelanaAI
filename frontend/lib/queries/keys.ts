/**
 * Query keys, in one place.
 *
 * Cache invalidation is by prefix, so the shapes matter: `['conversations']`
 * matches both the list and every detail entry, while `['conversations','list']`
 * matches only the list.
 */

export const authKeys = {
  me: () => ['auth', 'me'] as const,
};

export const tripKeys = {
  all: () => ['trips'] as const,
  list: () => ['trips', 'list'] as const,
  detail: (id: number) => ['trips', id] as const,
};

export const conversationKeys = {
  all: () => ['conversations'] as const,
  list: () => ['conversations', 'list'] as const,
  detail: (id: number) => ['conversations', id] as const,
};
