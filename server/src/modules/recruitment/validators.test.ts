import { jobPostSchema, applicationSchema, applicationStageSchema, interviewSchema, offerSchema } from './validators';

describe('recruitment validators', () => {
  describe('jobPostSchema', () => {
    const validPayload = {
      title: 'Senior Frontend Engineer',
      slug: 'senior-frontend-engineer',
      location: 'Lahore, Pakistan',
      employmentType: 'full-time',
      description: 'We are looking for a skilled frontend engineer to join our product team.',
    };

    it('accepts a valid job post payload', () => {
      const result = jobPostSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('defaults status to draft', () => {
      const parsed = jobPostSchema.parse(validPayload);
      expect(parsed.status).toBe('draft');
    });

    it('defaults openings to 1', () => {
      const parsed = jobPostSchema.parse(validPayload);
      expect(parsed.openings).toBe(1);
    });

    it('rejects a title shorter than 3 characters', () => {
      const result = jobPostSchema.safeParse({ ...validPayload, title: 'QA' });
      expect(result.success).toBe(false);
    });

    it('rejects a slug shorter than 3 characters', () => {
      const result = jobPostSchema.safeParse({ ...validPayload, slug: 'qa' });
      expect(result.success).toBe(false);
    });

    it('rejects a location shorter than 2 characters', () => {
      const result = jobPostSchema.safeParse({ ...validPayload, location: 'L' });
      expect(result.success).toBe(false);
    });

    it('rejects a description shorter than 20 characters', () => {
      const result = jobPostSchema.safeParse({ ...validPayload, description: 'Short description' });
      expect(result.success).toBe(false);
    });

    it('rejects openings below 1', () => {
      const result = jobPostSchema.safeParse({ ...validPayload, openings: 0 });
      expect(result.success).toBe(false);
    });

    it('accepts all valid status values', () => {
      for (const status of ['draft', 'published', 'closed'] as const) {
        expect(jobPostSchema.safeParse({ ...validPayload, status }).success).toBe(true);
      }
    });

    it('accepts an optional department', () => {
      const parsed = jobPostSchema.parse({ ...validPayload, department: 'dept-001' });
      expect(parsed.department).toBe('dept-001');
    });
  });

  describe('applicationSchema', () => {
    const validApplication = {
      jobPostId: 'job-001',
      name: 'Ali Raza',
      email: 'ali@example.com',
    };

    it('accepts a valid application payload', () => {
      const result = applicationSchema.safeParse(validApplication);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
      const result = applicationSchema.safeParse({ ...validApplication, email: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('rejects a name shorter than 2 characters', () => {
      const result = applicationSchema.safeParse({ ...validApplication, name: 'A' });
      expect(result.success).toBe(false);
    });

    it('accepts optional phone', () => {
      const parsed = applicationSchema.parse({ ...validApplication, phone: '+92-300-0000000' });
      expect(parsed.phone).toBe('+92-300-0000000');
    });

    it('accepts optional coverLetter', () => {
      const parsed = applicationSchema.parse({ ...validApplication, coverLetter: 'I am very interested in this role.' });
      expect(parsed.coverLetter).toBeDefined();
    });

    it('rejects a missing jobPostId', () => {
      const { jobPostId: _, ...rest } = validApplication;
      const result = applicationSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('applicationStageSchema', () => {
    it('accepts all valid stage values', () => {
      const stages = ['Applied', 'Screening', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected'] as const;
      for (const stage of stages) {
        expect(applicationStageSchema.safeParse({ stage }).success).toBe(true);
      }
    });

    it('rejects an invalid stage', () => {
      const result = applicationStageSchema.safeParse({ stage: 'Pending' });
      expect(result.success).toBe(false);
    });

    it('rejects a missing stage', () => {
      const result = applicationStageSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('interviewSchema', () => {
    const validInterview = {
      applicationId: 'app-001',
      scheduledAt: '2026-05-10T10:00:00.000Z',
      interviewer: 'Jane Smith',
    };

    it('accepts a valid interview payload', () => {
      const result = interviewSchema.safeParse(validInterview);
      expect(result.success).toBe(true);
    });

    it('defaults durationMinutes to 60', () => {
      const parsed = interviewSchema.parse(validInterview);
      expect(parsed.durationMinutes).toBe(60);
    });

    it('rejects durationMinutes below 15', () => {
      const result = interviewSchema.safeParse({ ...validInterview, durationMinutes: 10 });
      expect(result.success).toBe(false);
    });

    it('rejects a non-ISO scheduledAt', () => {
      const result = interviewSchema.safeParse({ ...validInterview, scheduledAt: '2026-05-10' });
      expect(result.success).toBe(false);
    });

    it('rejects an interviewer name shorter than 2 characters', () => {
      const result = interviewSchema.safeParse({ ...validInterview, interviewer: 'J' });
      expect(result.success).toBe(false);
    });

    it('accepts an optional meetingLink URL', () => {
      const result = interviewSchema.safeParse({ ...validInterview, meetingLink: 'https://meet.google.com/abc' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid meetingLink (not a URL)', () => {
      const result = interviewSchema.safeParse({ ...validInterview, meetingLink: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('accepts optional notes', () => {
      const parsed = interviewSchema.parse({ ...validInterview, notes: 'Focus on system design.' });
      expect(parsed.notes).toBe('Focus on system design.');
    });
  });

  describe('offerSchema', () => {
    const validOffer = {
      applicationId: 'app-001',
      title: 'Senior Engineer Offer',
      content: 'We are pleased to offer you the position of Senior Engineer at Meta Labs Tech.',
      salary: 150000,
    };

    it('accepts a valid offer payload', () => {
      const result = offerSchema.safeParse(validOffer);
      expect(result.success).toBe(true);
    });

    it('defaults status to draft', () => {
      const parsed = offerSchema.parse(validOffer);
      expect(parsed.status).toBe('draft');
    });

    it('rejects a salary of 0', () => {
      const result = offerSchema.safeParse({ ...validOffer, salary: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects a title shorter than 3 characters', () => {
      const result = offerSchema.safeParse({ ...validOffer, title: 'JD' });
      expect(result.success).toBe(false);
    });

    it('rejects content shorter than 20 characters', () => {
      const result = offerSchema.safeParse({ ...validOffer, content: 'Join us' });
      expect(result.success).toBe(false);
    });

    it('accepts all valid status values', () => {
      for (const status of ['draft', 'sent', 'accepted', 'declined'] as const) {
        expect(offerSchema.safeParse({ ...validOffer, status }).success).toBe(true);
      }
    });

    it('rejects an invalid status', () => {
      const result = offerSchema.safeParse({ ...validOffer, status: 'pending' });
      expect(result.success).toBe(false);
    });
  });
});
