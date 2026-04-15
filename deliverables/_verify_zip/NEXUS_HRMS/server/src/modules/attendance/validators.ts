import { z } from 'zod';

export const geoSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const attendanceActionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string().datetime(),
});

export const shiftSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  gracePeriodMinutes: z.number().min(0).default(10),
  workDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
  overtimeThresholdHours: z.number().min(0).default(8),
  isDefault: z.boolean().default(false),
});

export const overtimeRequestSchema = z.object({
  attendanceId: z.string(),
  hours: z.number().min(0.5),
  reason: z.string().min(5),
});
