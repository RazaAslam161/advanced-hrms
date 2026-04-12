import { z } from 'zod';
import { roles } from '../../common/constants/roles';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a number')
    .optional(),
  role: z.enum(roles),
  permissions: z.array(z.string()).optional(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  department: z.string().optional(),
  designation: z.string().min(2).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaToken: z.string().length(6).optional(),
});

export const mfaVerifySchema = z.object({
  token: z.string().length(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

export const transferSuperAdminSchema = z.object({
  currentPassword: z.string().min(1),
  targetUserId: z.string().min(1),
});
