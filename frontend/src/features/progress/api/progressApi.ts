import type { ApiClient } from '@/shared/api/client';
import {
  collectionPageSchema,
  detailSchema,
  progressSchema,
  historySchema,
  resultSchema,
  puzzleMetadataSchema,
  sessionPiecesSchema,
} from '../model/schemas';
import type { CollectionFilter } from '../model/schemas';
export const createProgressApi = (client: ApiClient) => ({
  collections: (filter: CollectionFilter, page: number, signal: AbortSignal) =>
    client.request(
      '/collections?' + new URLSearchParams({ filter, page: String(page), size: '8' }),
      collectionPageSchema,
      { signal },
    ),
  detail: (id: string, signal: AbortSignal) =>
    client.request('/collections/' + id, detailSchema, { signal }),
  progress: (signal: AbortSignal) => client.request('/progress', progressSchema, { signal }),
  history: (page: number, signal: AbortSignal) =>
    client.request(
      '/history?' + new URLSearchParams({ page: String(page), size: '8' }),
      historySchema,
      { signal },
    ),
  result: (id: string, signal: AbortSignal) =>
    client.request('/sessions/' + id + '/result', resultSchema, { signal }),
  pieces: (id: string, signal: AbortSignal) =>
    client.request('/sessions/' + id, sessionPiecesSchema, { signal }),
  puzzles: (signal: AbortSignal) => client.request('/puzzles', puzzleMetadataSchema, { signal }),
});
