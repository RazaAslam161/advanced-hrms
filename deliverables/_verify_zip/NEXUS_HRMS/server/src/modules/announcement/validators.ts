import { z } from 'zod';

export const announcementSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  audience: z.enum(['all', 'department']).default('all'),
  department: z.string().optional(),
  published: z.boolean().default(false),
});
