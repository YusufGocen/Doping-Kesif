import { z } from 'zod';
export const draftSchema = z.object({
  ownerId: z.uuid(),
  puzzleId: z.uuid(),
  puzzleTitle: z.string(),
  gradeLevel: z.number().int().min(5).max(8),
  subjectId: z.uuid(),
  subjectName: z.string(),
  topicId: z.uuid().nullable(),
  topicName: z.string(),
});
export type DiscoveryDraft = z.infer<typeof draftSchema>;
export const groupsSchema = z.array(
  z.object({
    id: z.string().min(1),
    name: z.string(),
    memberCount: z.number().int().nonnegative(),
  }),
);
export const friendsSchema = z.array(
  z.object({ externalUserId: z.string().min(1), displayName: z.string() }),
);
export const invitationSchema = z.object({
  id: z.uuid(),
  roomId: z.uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED']),
  expiresAt: z.string(),
});

export const selectionSchema = z.object({
  groupId: z.string(),
  puzzleId: z.uuid(),
  subjectId: z.uuid(),
  gradeLevel: z.number().int(),
  topicId: z.uuid().nullable(),
});
export const incomingSchema = z.array(
  invitationSchema.extend({ inviterId: z.uuid(), inviteeId: z.uuid(), selection: selectionSchema }),
);
export const roomSchema = z.object({
  id: z.uuid(),
  ownerPlayerId: z.uuid(),
  status: z.enum(['OPEN', 'FULL', 'STARTED', 'CLOSED', 'CANCELLED', 'EXPIRED']),
  selection: selectionSchema,
  expiresAt: z.string(),
  players: z.array(
    z.object({
      playerId: z.uuid(),
      displayName: z.string(),
      slot: z.number(),
      ready: z.boolean(),
      active: z.boolean(),
    }),
  ),
  readyToStart: z.boolean(),
  sequence: z.number(),
  joinCode: z.string().nullable(),
});
export const activeRoomSchema = roomSchema.optional();

export type RoomSnapshot = z.infer<typeof roomSchema>;
