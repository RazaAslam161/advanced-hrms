import { z } from 'zod';

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1200, 'Message is too long'),
  portal: z.string().trim().min(1).max(80),
  pageLabel: z.string().trim().min(1).max(80),
  pathname: z.string().trim().min(1).max(180),
});
