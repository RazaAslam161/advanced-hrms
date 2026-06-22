import { z } from 'zod';

export const reportBuilderSchema = z.object({
  module: z.enum(['employees', 'attendance', 'leave', 'payroll', 'recruitment', 'performance']),
  format: z.enum(['pdf', 'excel']).default('excel'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  filters: z.record(z.string()).default({}),
});

export const nlQuerySchema = z.object({
  query: z.string().min(5),
});
