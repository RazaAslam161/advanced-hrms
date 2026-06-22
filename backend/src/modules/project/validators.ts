import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(2),
  clientName: z.string().min(2),
  department: z.string(),
  managerId: z.string(),
  memberIds: z.array(z.string()).default([]),
  description: z.string().min(10),
  status: z.enum(['planning', 'active', 'onHold', 'completed']).default('planning'),
  health: z.enum(['green', 'amber', 'red']).default('green'),
  progress: z.number().min(0).max(100).default(0),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

export const projectUpdateSchema = z.object({
  summary: z.string().min(8),
  blockers: z.string().optional(),
  progress: z.number().min(0).max(100),
  projectStatus: z.enum(['planning', 'active', 'onHold', 'completed']).default('active'),
});
