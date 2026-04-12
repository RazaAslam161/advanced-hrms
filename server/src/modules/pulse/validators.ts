import { z } from 'zod';

export const pulseSurveySchema = z.object({
  title: z.string().min(3),
  questions: z.array(z.string().min(3)).min(1),
  active: z.boolean().default(true),
});

export const pulseResponseSchema = z.object({
  surveyId: z.string(),
  answers: z
    .array(
      z.object({
        question: z.string().min(3),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .min(1),
});

export const recognitionSchema = z.object({
  fromEmployeeId: z.string(),
  toEmployeeId: z.string(),
  message: z.string().min(5),
  badge: z.string().min(2),
});
