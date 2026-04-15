import { z } from 'zod';

export const gigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  department: z.string().optional(),
  ownerId: z.string(),
  skillTags: z.array(z.string()).default([]),
  status: z.enum(['open', 'inProgress', 'completed', 'closed']).default('open'),
});
