import { z } from 'zod';
import type { ApiClient } from '@/shared/api/client';
import { sessionSchema } from '../model/schemas';
export const createGameApi = (client: ApiClient) => ({
  start: (roomId: string) =>
    client.request('/rooms/' + roomId + '/start', sessionSchema, { method: 'POST' }),
  active: async (signal: AbortSignal) =>
    (await client.request('/sessions/active', sessionSchema.optional(), { signal })) ?? null,
  snapshot: (id: string, signal: AbortSignal) =>
    client.request('/sessions/' + id, sessionSchema, { signal }),
  answer: (id: string, roundId: string, body: { clientRequestId: string; optionKey: string }) =>
    client.request('/sessions/' + id + '/rounds/' + roundId + '/answers', sessionSchema, {
      method: 'POST',
      body: { clientRequestId: body.clientRequestId, optionKey: body.optionKey },
    }),
  next: (id: string, roundNo: number) =>
    client.request('/sessions/' + id + '/continue', sessionSchema, {
      method: 'POST',
      body: { roundNo },
    }),
  roster: (roomId: string, signal: AbortSignal) =>
    client.request(
      '/rooms/' + roomId,
      z.object({ players: z.array(z.object({ playerId: z.uuid(), displayName: z.string() })) }),
      { signal },
    ),
  puzzles: (signal: AbortSignal) =>
    client.request(
      '/puzzles',
      z.array(z.object({ id: z.uuid(), code: z.string(), title: z.string() })),
      { signal },
    ),
});
