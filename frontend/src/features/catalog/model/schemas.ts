import { z } from 'zod';

export const gradeSchema = z.object({
  gradeLevel: z.number().int().min(5).max(8),
  playable: z.boolean(),
});
export const subjectSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  availableQuestionCount: z.number().int().nonnegative(),
  playable: z.boolean(),
});
export const topicSchema = subjectSchema;
export const puzzleSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  title: z.string(),
  assetKey: z.string(),
  pieceCount: z.literal(20),
});
export const gradesSchema = z.array(gradeSchema);
export const subjectsSchema = z.array(subjectSchema);
export const topicsSchema = z.array(topicSchema);
export const puzzlesSchema = z.array(puzzleSchema);
export const puzzleProgressSchema = z.object({
  items: z.array(
    z.object({
      puzzleId: z.uuid(),
      unlockedCount: z.number().int().min(0).max(20),
      completedAt: z.string().nullable(),
    }),
  ),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
});
export type Grade = z.infer<typeof gradeSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Puzzle = z.infer<typeof puzzleSchema>;
