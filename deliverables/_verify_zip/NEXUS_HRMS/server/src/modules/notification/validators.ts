import { z } from 'zod';

export const notificationPreferenceSchema = z.object({
  preferences: z.object({
    leave: z.object({ email: z.boolean(), inApp: z.boolean() }),
    payroll: z.object({ email: z.boolean(), inApp: z.boolean() }),
    review: z.object({ email: z.boolean(), inApp: z.boolean() }),
    announcement: z.object({ email: z.boolean(), inApp: z.boolean() }),
    system: z.object({ email: z.boolean(), inApp: z.boolean() }),
  }),
});

export const notificationReadSchema = z.object({
  read: z.boolean(),
});
