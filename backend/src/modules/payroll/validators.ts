import { z } from 'zod';

export const payrollRunSchema = z.object({
  month: z.string().min(3),
  year: z.number().min(2024),
  notes: z.string().optional(),
});

export const payrollDecisionSchema = z.object({
  status: z.enum(['approved']),
});

export const loanAdvanceSchema = z.object({
  employeeId: z.string(),
  type: z.enum(['loan', 'advance']),
  amount: z.number().min(1),
  monthlyDeduction: z.number().min(1),
});
