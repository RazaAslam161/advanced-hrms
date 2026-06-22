import { z } from 'zod';

export const jobPostSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  department: z.string().optional(),
  location: z.string().min(2),
  employmentType: z.string().min(2),
  description: z.string().min(20),
  openings: z.number().min(1).default(1),
  status: z.enum(['draft', 'published', 'closed']).default('draft'),
});

export const applicationSchema = z.object({
  jobPostId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  coverLetter: z.string().optional(),
});

export const applicationStageSchema = z.object({
  stage: z.enum(['Applied', 'Screening', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected']),
});

export const interviewSchema = z.object({
  applicationId: z.string(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().min(15).default(60),
  interviewer: z.string().min(2),
  meetingLink: z.string().url().optional(),
  notes: z.string().optional(),
});

export const offerSchema = z.object({
  applicationId: z.string(),
  title: z.string().min(3),
  content: z.string().min(20),
  salary: z.number().min(1),
  status: z.enum(['draft', 'sent', 'accepted', 'declined']).default('draft'),
});
