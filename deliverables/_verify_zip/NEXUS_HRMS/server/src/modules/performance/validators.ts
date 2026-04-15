import { z } from 'zod';

const reviewCycleBaseSchema = z.object({
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  ratingScale: z.array(z.number().min(1).max(5)).default([1, 2, 3, 4, 5]),
  status: z.enum(['draft', 'active', 'completed']).default('draft'),
});

export const reviewCycleSchema = reviewCycleBaseSchema
  .superRefine((value, ctx) => {
    if (new Date(value.endDate) < new Date(value.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after the start date',
        path: ['endDate'],
      });
    }
  });

export const reviewCycleUpdateSchema = reviewCycleBaseSchema.partial().superRefine((value, ctx) => {
  if (value.startDate && value.endDate && new Date(value.endDate) < new Date(value.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be after the start date',
      path: ['endDate'],
    });
  }
});

export const objectiveSchema = z.object({
  employeeId: z.string(),
  title: z.string().min(3),
  description: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  status: z.enum(['onTrack', 'atRisk', 'behind', 'complete']).default('onTrack'),
});

export const feedbackSchema = z.object({
  employeeId: z.string(),
  cycleId: z.string(),
  reviewerId: z.string(),
  category: z.enum(['self', 'manager', 'peer', 'skip-level']),
  anonymous: z.boolean().default(false),
  strengths: z.string().min(10),
  opportunities: z.string().min(10),
  rating: z.number().min(1).max(5),
});

export const reviewSchema = z.object({
  employeeId: z.string(),
  cycleId: z.string(),
  summary: z.string().min(10),
  overallRating: z.number().min(1).max(5),
  calibrationBand: z.enum(['low', 'mid', 'high']).default('mid'),
  status: z.enum(['draft', 'submitted', 'calibrated']).default('draft'),
});

export const pipSchema = z.object({
  employeeId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  goals: z.array(z.string().min(3)),
  supportActions: z.array(z.string().min(3)),
  status: z.enum(['active', 'completed', 'closed']).default('active'),
});
