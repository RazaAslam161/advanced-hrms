import {
  reviewCycleSchema,
  reviewCycleUpdateSchema,
  objectiveSchema,
  feedbackSchema,
  reviewSchema,
  pipSchema,
} from './validators';

describe('performance validators', () => {
  describe('reviewCycleSchema', () => {
    const validCycle = {
      name: 'Q1 2026',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-03-31T00:00:00.000Z',
    };

    it('accepts a valid review cycle', () => {
      const result = reviewCycleSchema.safeParse(validCycle);
      expect(result.success).toBe(true);
    });

    it('defaults status to draft', () => {
      const parsed = reviewCycleSchema.parse(validCycle);
      expect(parsed.status).toBe('draft');
    });

    it('defaults ratingScale to [1,2,3,4,5]', () => {
      const parsed = reviewCycleSchema.parse(validCycle);
      expect(parsed.ratingScale).toEqual([1, 2, 3, 4, 5]);
    });

    it('rejects endDate before startDate', () => {
      const result = reviewCycleSchema.safeParse({
        ...validCycle,
        startDate: '2026-03-31T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a name shorter than 2 characters', () => {
      const result = reviewCycleSchema.safeParse({ ...validCycle, name: 'Q' });
      expect(result.success).toBe(false);
    });

    it('accepts all valid status values', () => {
      for (const status of ['draft', 'active', 'completed'] as const) {
        expect(reviewCycleSchema.safeParse({ ...validCycle, status }).success).toBe(true);
      }
    });

    it('rejects an invalid status', () => {
      const result = reviewCycleSchema.safeParse({ ...validCycle, status: 'archived' });
      expect(result.success).toBe(false);
    });

    it('rejects a non-ISO startDate', () => {
      const result = reviewCycleSchema.safeParse({ ...validCycle, startDate: '2026-01-01' });
      expect(result.success).toBe(false);
    });

    it('rejects a rating scale value outside 1-5', () => {
      const result = reviewCycleSchema.safeParse({ ...validCycle, ratingScale: [1, 2, 6] });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewCycleUpdateSchema', () => {
    it('accepts a partial update payload', () => {
      const result = reviewCycleUpdateSchema.safeParse({ name: 'Q2 2026' });
      expect(result.success).toBe(true);
    });

    it('accepts an empty object (all fields optional)', () => {
      const result = reviewCycleUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects endDate before startDate when both are provided', () => {
      const result = reviewCycleUpdateSchema.safeParse({
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-05-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('accepts endDate after startDate', () => {
      const result = reviewCycleUpdateSchema.safeParse({
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: '2026-06-30T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('objectiveSchema', () => {
    const validObjective = {
      employeeId: 'emp-001',
      title: 'Improve test coverage',
    };

    it('accepts a valid objective', () => {
      const result = objectiveSchema.safeParse(validObjective);
      expect(result.success).toBe(true);
    });

    it('defaults progress to 0', () => {
      const parsed = objectiveSchema.parse(validObjective);
      expect(parsed.progress).toBe(0);
    });

    it('defaults status to onTrack', () => {
      const parsed = objectiveSchema.parse(validObjective);
      expect(parsed.status).toBe('onTrack');
    });

    it('rejects progress above 100', () => {
      const result = objectiveSchema.safeParse({ ...validObjective, progress: 101 });
      expect(result.success).toBe(false);
    });

    it('rejects progress below 0', () => {
      const result = objectiveSchema.safeParse({ ...validObjective, progress: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects a title shorter than 3 characters', () => {
      const result = objectiveSchema.safeParse({ ...validObjective, title: 'Do' });
      expect(result.success).toBe(false);
    });

    it('accepts all valid status values', () => {
      for (const status of ['onTrack', 'atRisk', 'behind', 'complete'] as const) {
        expect(objectiveSchema.safeParse({ ...validObjective, status }).success).toBe(true);
      }
    });

    it('accepts an optional description', () => {
      const parsed = objectiveSchema.parse({ ...validObjective, description: 'Raise coverage above 80%' });
      expect(parsed.description).toBe('Raise coverage above 80%');
    });
  });

  describe('feedbackSchema', () => {
    const validFeedback = {
      employeeId: 'emp-001',
      cycleId: 'cycle-001',
      reviewerId: 'mgr-001',
      category: 'manager' as const,
      strengths: 'Excellent communication skills',
      opportunities: 'Could improve time management',
      rating: 4,
    };

    it('accepts a valid feedback payload', () => {
      const result = feedbackSchema.safeParse(validFeedback);
      expect(result.success).toBe(true);
    });

    it('defaults anonymous to false', () => {
      const parsed = feedbackSchema.parse(validFeedback);
      expect(parsed.anonymous).toBe(false);
    });

    it('accepts all valid categories', () => {
      for (const category of ['self', 'manager', 'peer', 'skip-level'] as const) {
        expect(feedbackSchema.safeParse({ ...validFeedback, category }).success).toBe(true);
      }
    });

    it('rejects an invalid category', () => {
      const result = feedbackSchema.safeParse({ ...validFeedback, category: 'hr' });
      expect(result.success).toBe(false);
    });

    it('rejects strengths shorter than 10 characters', () => {
      const result = feedbackSchema.safeParse({ ...validFeedback, strengths: 'Good' });
      expect(result.success).toBe(false);
    });

    it('rejects opportunities shorter than 10 characters', () => {
      const result = feedbackSchema.safeParse({ ...validFeedback, opportunities: 'Improve' });
      expect(result.success).toBe(false);
    });

    it('rejects a rating below 1', () => {
      const result = feedbackSchema.safeParse({ ...validFeedback, rating: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects a rating above 5', () => {
      const result = feedbackSchema.safeParse({ ...validFeedback, rating: 6 });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewSchema', () => {
    const validReview = {
      employeeId: 'emp-001',
      cycleId: 'cycle-001',
      summary: 'Outstanding contributor this quarter.',
      overallRating: 4,
    };

    it('accepts a valid review payload', () => {
      const result = reviewSchema.safeParse(validReview);
      expect(result.success).toBe(true);
    });

    it('defaults calibrationBand to mid', () => {
      const parsed = reviewSchema.parse(validReview);
      expect(parsed.calibrationBand).toBe('mid');
    });

    it('defaults status to draft', () => {
      const parsed = reviewSchema.parse(validReview);
      expect(parsed.status).toBe('draft');
    });

    it('accepts all valid calibrationBand values', () => {
      for (const band of ['low', 'mid', 'high'] as const) {
        expect(reviewSchema.safeParse({ ...validReview, calibrationBand: band }).success).toBe(true);
      }
    });

    it('rejects a summary shorter than 10 characters', () => {
      const result = reviewSchema.safeParse({ ...validReview, summary: 'Good job' });
      expect(result.success).toBe(false);
    });

    it('rejects an overallRating outside 1-5', () => {
      expect(reviewSchema.safeParse({ ...validReview, overallRating: 0 }).success).toBe(false);
      expect(reviewSchema.safeParse({ ...validReview, overallRating: 6 }).success).toBe(false);
    });

    it('accepts all valid status values', () => {
      for (const status of ['draft', 'submitted', 'calibrated'] as const) {
        expect(reviewSchema.safeParse({ ...validReview, status }).success).toBe(true);
      }
    });
  });

  describe('pipSchema', () => {
    const validPip = {
      employeeId: 'emp-001',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-06-30T00:00:00.000Z',
      goals: ['Improve code quality', 'Meet all sprint deadlines'],
      supportActions: ['Weekly coaching session', 'Pair programming twice a week'],
    };

    it('accepts a valid PIP payload', () => {
      const result = pipSchema.safeParse(validPip);
      expect(result.success).toBe(true);
    });

    it('defaults status to active', () => {
      const parsed = pipSchema.parse(validPip);
      expect(parsed.status).toBe('active');
    });

    it('rejects a goal string shorter than 3 characters', () => {
      const result = pipSchema.safeParse({ ...validPip, goals: ['Ok'] });
      expect(result.success).toBe(false);
    });

    it('rejects a supportAction shorter than 3 characters', () => {
      const result = pipSchema.safeParse({ ...validPip, supportActions: ['Do'] });
      expect(result.success).toBe(false);
    });

    it('accepts all valid status values', () => {
      for (const status of ['active', 'completed', 'closed'] as const) {
        expect(pipSchema.safeParse({ ...validPip, status }).success).toBe(true);
      }
    });

    it('rejects a non-ISO startDate', () => {
      const result = pipSchema.safeParse({ ...validPip, startDate: '2026-04-01' });
      expect(result.success).toBe(false);
    });
  });
});
