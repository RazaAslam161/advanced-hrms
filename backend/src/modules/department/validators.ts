import { z } from 'zod';

const emptyStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const departmentBodySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  description: z.string().optional(),
  head: z.preprocess(emptyStringToUndefined, z.string().optional()),
  parentDepartment: z.preprocess(emptyStringToUndefined, z.string().optional()),
  status: z.enum(['active', 'inactive']).default('active'),
});
