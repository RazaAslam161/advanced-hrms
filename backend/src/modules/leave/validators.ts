import { z } from 'zod';

export const leaveApplySchema = z
  .object({
    employeeId: z.string().optional(),
    leaveType: z.enum(['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity']),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    halfDay: z.boolean().default(false),
    reason: z.string().min(5),
  })
  .refine((payload) => new Date(payload.endDate).getTime() >= new Date(payload.startDate).getTime(), {
    path: ['endDate'],
    message: 'End date must be on or after start date',
  });

export const leaveDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
});
