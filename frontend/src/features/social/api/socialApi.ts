import { z } from 'zod';
import type { ApiClient } from '@/shared/api/client';
import {
  groupsSchema,
  friendsSchema,
  invitationSchema,
  incomingSchema,
  roomSchema,
  activeRoomSchema,
} from '../model/schemas';
export const createSocialApi = (client: ApiClient) => ({
  createRoom: (body: {
    clientRequestId: string;
    selection: {
      groupId: string;
      puzzleId: string;
      subjectId: string;
      gradeLevel: number;
      topicId: string | null;
    };
  }) => client.request('/rooms', roomSchema, { method: 'POST', body }),
  joinRoom: (code: string) =>
    client.request('/rooms/join', roomSchema, { method: 'POST', body: { code } }),
  cancelRoom: (id: string) =>
    client.request('/rooms/' + id + '/cancel', roomSchema, { method: 'POST' }),
  puzzles: (signal: AbortSignal) =>
    client.request('/puzzles', z.array(z.object({ id: z.uuid(), title: z.string() })), { signal }),
  subjects: (grade: number, signal: AbortSignal) =>
    client.request(
      '/catalog/subjects?grade=' + grade,
      z.array(z.object({ id: z.uuid(), name: z.string() })),
      { signal },
    ),
  topics: (grade: number, subjectId: string, signal: AbortSignal) =>
    client.request(
      '/catalog/topics?' + new URLSearchParams({ grade: String(grade), subjectId }),
      z.array(z.object({ id: z.uuid(), name: z.string() })),
      { signal },
    ),
  incoming: (signal: AbortSignal) =>
    client.request('/invitations/incoming', incomingSchema, { signal }),
  active: async (signal: AbortSignal) =>
    (await client.request('/rooms/active', activeRoomSchema, { signal })) ?? null,
  room: (id: string, signal: AbortSignal) => client.request('/rooms/' + id, roomSchema, { signal }),
  accept: (id: string) =>
    client.request('/invitations/' + id + '/accept', roomSchema, { method: 'POST' }),
  reject: (id: string) =>
    client.request('/invitations/' + id + '/reject', invitationSchema, { method: 'POST' }),
  ready: (id: string, ready: boolean) =>
    client.request('/rooms/' + id + '/ready', roomSchema, { method: 'POST', body: { ready } }),
  leave: (id: string) => client.request('/rooms/' + id + '/leave', roomSchema, { method: 'POST' }),
  groups: (signal: AbortSignal) => client.request('/groups', groupsSchema, { signal }),
  friends: (groupId: string, signal: AbortSignal) =>
    client.request('/groups/' + encodeURIComponent(groupId) + '/friends', friendsSchema, {
      signal,
    }),
  invite: (body: unknown) =>
    client.request('/invitations', invitationSchema, { method: 'POST', body }),
  cancel: (id: string) =>
    client.request('/invitations/' + id + '/cancel', invitationSchema, { method: 'POST' }),
});
