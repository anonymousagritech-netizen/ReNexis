import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z
    .enum([
      'ADMIN',
      'UNDERWRITER',
      'CLAIMS',
      'ACCOUNTS',
      'ACTUARY',
      'AUDITOR',
      'COMPLIANCE',
      'INVESTMENT_MANAGER',
      'VIEWER',
    ])
    .default('VIEWER'),
  entityId: z.string().uuid().optional(),
  delegationLimit: z.number().nonnegative().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
