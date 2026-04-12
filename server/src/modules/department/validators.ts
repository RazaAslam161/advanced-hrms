import { z } from 'zod';

export const departmentBodySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  description: z.string().optional(),
  head: z.string().optional(),
  parentDepartment: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});
