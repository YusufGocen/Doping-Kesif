import { z } from 'zod';
const count = z.number().int().nonnegative();
export const collectionSchema = z.object({
  puzzleId: z.uuid(),
  title: z.string(),
  assetKey: z.string(),
  unlockedCount: count.max(20),
  completedAt: z.string().nullable(),
});
export const collectionPageSchema = z.object({
  items: z.array(collectionSchema),
  page: count,
  size: count,
  total: count,
});
export const detailSchema = z.object({
  collection: collectionSchema,
  pieces: z.array(count.min(1).max(20)),
});
export const progressSchema = z.object({
  totalXp: count,
  completedGames: count,
  correctAnswers: count,
});
export const historySchema = z.object({
  items: z.array(
    z.object({
      sessionId: z.uuid(),
      puzzleId: z.uuid(),
      puzzleTitle: z.string(),
      endedAt: z.string(),
      correctCount: count.max(10),
      revealedCount: count.max(20),
      collectionAddedCount: count.max(20),
      earnedXp: count,
      rewardsFinalized: z.boolean(),
    }),
  ),
  page: count,
  size: count,
  total: count,
});
export const resultSchema = z.object({
  sessionId: z.uuid(),
  puzzleId: z.uuid(),
  revealedCount: count.max(20),
  endedAt: z.string(),
  rewardsFinalized: z.boolean(),
  players: z.array(
    z.object({
      playerId: z.uuid(),
      displayName: z.string(),
      correctCount: count.max(10),
      collectionAddedCount: count.max(20),
      earnedXp: count,
    }),
  ),
});
export const puzzleMetadataSchema = z.array(
  z.object({ id: z.uuid(), code: z.string(), title: z.string() }),
);
export const sessionPiecesSchema = z.object({ revealedPieces: z.array(count.min(1).max(20)) });
export type CollectionFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';
