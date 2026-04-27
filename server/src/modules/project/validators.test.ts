import { projectSchema, projectUpdateSchema } from './validators';

describe('project validators', () => {
  describe('projectSchema', () => {
    const validPayload = {
      name: 'NEXUS Portal',
      code: 'NXP',
      clientName: 'Meta Labs',
      department: 'dept-001',
      managerId: 'mgr-001',
      description: 'Build the internal HR portal.',
      startDate: '2026-01-01T00:00:00.000Z',
    };

    it('accepts a valid project payload', () => {
      const result = projectSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('defaults status to planning', () => {
      const parsed = projectSchema.parse(validPayload);
      expect(parsed.status).toBe('planning');
    });

    it('defaults health to green', () => {
      const parsed = projectSchema.parse(validPayload);
      expect(parsed.health).toBe('green');
    });

    it('defaults progress to 0', () => {
      const parsed = projectSchema.parse(validPayload);
      expect(parsed.progress).toBe(0);
    });

    it('defaults memberIds to an empty array', () => {
      const parsed = projectSchema.parse(validPayload);
      expect(parsed.memberIds).toEqual([]);
    });

    it('rejects a name shorter than 3 characters', () => {
      const result = projectSchema.safeParse({ ...validPayload, name: 'AB' });
      expect(result.success).toBe(false);
    });

    it('rejects a code shorter than 2 characters', () => {
      const result = projectSchema.safeParse({ ...validPayload, code: 'N' });
      expect(result.success).toBe(false);
    });

    it('rejects a clientName shorter than 2 characters', () => {
      const result = projectSchema.safeParse({ ...validPayload, clientName: 'X' });
      expect(result.success).toBe(false);
    });

    it('rejects a description shorter than 10 characters', () => {
      const result = projectSchema.safeParse({ ...validPayload, description: 'Too short' });
      expect(result.success).toBe(false);
    });

    it('accepts all valid status values', () => {
      for (const status of ['planning', 'active', 'onHold', 'completed'] as const) {
        expect(projectSchema.safeParse({ ...validPayload, status }).success).toBe(true);
      }
    });

    it('accepts all valid health values', () => {
      for (const health of ['green', 'amber', 'red'] as const) {
        expect(projectSchema.safeParse({ ...validPayload, health }).success).toBe(true);
      }
    });

    it('rejects progress above 100', () => {
      const result = projectSchema.safeParse({ ...validPayload, progress: 101 });
      expect(result.success).toBe(false);
    });

    it('rejects a non-ISO startDate', () => {
      const result = projectSchema.safeParse({ ...validPayload, startDate: '2026-01-01' });
      expect(result.success).toBe(false);
    });

    it('accepts an optional endDate', () => {
      const result = projectSchema.safeParse({ ...validPayload, endDate: '2026-12-31T00:00:00.000Z' });
      expect(result.success).toBe(true);
    });

    it('accepts memberIds with values', () => {
      const parsed = projectSchema.parse({ ...validPayload, memberIds: ['emp-001', 'emp-002'] });
      expect(parsed.memberIds).toEqual(['emp-001', 'emp-002']);
    });
  });

  describe('projectUpdateSchema', () => {
    const validUpdate = {
      summary: 'Sprint 5 completed with all deliverables.',
      progress: 75,
    };

    it('accepts a valid project update payload', () => {
      const result = projectUpdateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('defaults projectStatus to active', () => {
      const parsed = projectUpdateSchema.parse(validUpdate);
      expect(parsed.projectStatus).toBe('active');
    });

    it('rejects a summary shorter than 8 characters', () => {
      const result = projectUpdateSchema.safeParse({ ...validUpdate, summary: 'Done' });
      expect(result.success).toBe(false);
    });

    it('rejects progress above 100', () => {
      const result = projectUpdateSchema.safeParse({ ...validUpdate, progress: 101 });
      expect(result.success).toBe(false);
    });

    it('rejects progress below 0', () => {
      const result = projectUpdateSchema.safeParse({ ...validUpdate, progress: -1 });
      expect(result.success).toBe(false);
    });

    it('accepts an optional blockers field', () => {
      const parsed = projectUpdateSchema.parse({ ...validUpdate, blockers: 'API integration pending' });
      expect(parsed.blockers).toBe('API integration pending');
    });

    it('accepts all valid projectStatus values', () => {
      for (const projectStatus of ['planning', 'active', 'onHold', 'completed'] as const) {
        expect(projectUpdateSchema.safeParse({ ...validUpdate, projectStatus }).success).toBe(true);
      }
    });
  });
});
