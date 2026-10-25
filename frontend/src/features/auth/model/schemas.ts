import { z } from 'zod';
export const demoUsersSchema = z.array(
  z.object({ userKey: z.string().min(1), displayName: z.string().min(1) }),
);
export const tokenSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().positive(),
  expiresAt: z.iso.datetime(),
});
export const meSchema = z.object({
  id: z.uuid(),
  externalUserId: z.string().min(1),
  displayName: z.string().min(1),
  roles: z.array(z.string()).refine((roles) => roles.includes('STUDENT')),
});
