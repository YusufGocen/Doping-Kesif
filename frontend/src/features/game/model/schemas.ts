import { z } from 'zod';
const body = z.object({ text: z.string() });
export const sessionSchema = z.object({
  id: z.uuid(),
  roomId: z.uuid(),
  puzzleId: z.uuid(),
  status: z.enum(['READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABANDONED']),
  currentRoundNo: z.number().int().min(1).max(10),
  revealedCount: z.number().int().min(0).max(20),
  revealedPieces: z.array(z.number().int().min(1).max(20)),
  players: z.array(
    z.object({
      playerId: z.uuid(),
      slot: z.number(),
      correctCount: z.number(),
      answered: z.boolean(),
      continuing: z.boolean(),
    }),
  ),
  round: z.object({
    id: z.uuid(),
    roundNo: z.number(),
    status: z.enum(['PENDING', 'QUESTION_OPEN', 'REVEAL', 'COMPLETED']),
    question: z.object({ body, options: z.array(z.object({ key: z.string(), body })).min(2) }),
    deadlineAt: z.string().nullable(),
    revealDeadlineAt: z.string().nullable(),
    correctOptionKey: z.string().nullable(),
    answers: z.array(
      z.object({
        playerId: z.uuid(),
        optionKey: z.string().nullable(),
        correct: z.boolean(),
        source: z.string(),
      }),
    ),
  }),
  sequence: z.number(),
});
export type GameSnapshot = z.infer<typeof sessionSchema>;
