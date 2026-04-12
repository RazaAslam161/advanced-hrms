import { z } from 'zod';
import { roles } from '../../common/constants/roles';

const skillSchema = z.object({
  skill: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  verified: z.boolean().default(false),
});

const documentSchema = z.object({
  type: z.string().min(2),
  expiresAt: z.string().datetime().optional(),
});

export const employeeBodySchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  displayName: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(10).optional(),
  role: z.enum(roles).default('employee'),
  permissions: z.array(z.string()).optional(),
  department: z.string().optional(),
  designation: z.string().min(2),
  reportingTo: z.string().optional(),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'intern']),
  joiningDate: z.string().datetime(),
  probationEndDate: z.string().datetime().optional(),
  salary: z.object({
    basic: z.number().min(0),
    houseRent: z.number().min(0).default(0),
    medical: z.number().min(0).default(0),
    transport: z.number().min(0).default(0),
    currency: z.string().default('PKR'),
    bonus: z.number().min(0).default(0),
  }),
  bankDetails: z
    .object({
      bankName: z.string(),
      accountNo: z.string(),
      iban: z.string().optional(),
    })
    .optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string(),
        relation: z.string(),
        phone: z.string(),
      }),
    )
    .default([]),
  skills: z.array(skillSchema).default([]),
  timezone: z.string().default('Asia/Karachi'),
  workLocation: z.enum(['onsite', 'remote', 'hybrid']).default('onsite'),
  country: z.string().default('Pakistan'),
  status: z.enum(['active', 'probation', 'inactive', 'terminated']).default('active'),
});

export const employeeQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});

export const employeeDocumentSchema = documentSchema;
