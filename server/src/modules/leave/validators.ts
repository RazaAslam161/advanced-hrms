import { z } from 'zod';

export const leaveApplySchema = z.object({
  leaveType: z.enum(['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  halfDay: z.boolean().default(false),
  reason: z.string().min(5),
});

export const leaveDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
});
