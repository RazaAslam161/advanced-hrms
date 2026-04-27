import { reportBuilderSchema, nlQuerySchema } from './validators';

describe('analytics validators', () => {
  describe('reportBuilderSchema', () => {
    const validPayload = {
      module: 'employees' as const,
      format: 'excel' as const,
    };

    it('accepts a valid report builder payload', () => {
      const result = reportBuilderSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('defaults format to excel when not provided', () => {
      const parsed = reportBuilderSchema.parse({ module: 'attendance' });
      expect(parsed.format).toBe('excel');
    });

    it('defaults filters to an empty object when not provided', () => {
      const parsed = reportBuilderSchema.parse({ module: 'leave' });
      expect(parsed.filters).toEqual({});
    });

    it('accepts all valid module values', () => {
      const modules = ['employees', 'attendance', 'leave', 'payroll', 'recruitment', 'performance'] as const;
      for (const module of modules) {
        expect(reportBuilderSchema.safeParse({ module }).success).toBe(true);
      }
    });

    it('rejects an invalid module', () => {
      const result = reportBuilderSchema.safeParse({ module: 'unknown' });
      expect(result.success).toBe(false);
    });

    it('accepts pdf format', () => {
      const result = reportBuilderSchema.safeParse({ ...validPayload, format: 'pdf' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid format', () => {
      const result = reportBuilderSchema.safeParse({ ...validPayload, format: 'csv' });
      expect(result.success).toBe(false);
    });

    it('accepts optional ISO datetime startDate', () => {
      const result = reportBuilderSchema.safeParse({ ...validPayload, startDate: '2026-01-01T00:00:00.000Z' });
      expect(result.success).toBe(true);
    });

    it('rejects a non-ISO startDate', () => {
      const result = reportBuilderSchema.safeParse({ ...validPayload, startDate: '2026-01-01' });
      expect(result.success).toBe(false);
    });

    it('accepts custom filters object', () => {
      const parsed = reportBuilderSchema.parse({ ...validPayload, filters: { department: 'eng' } });
      expect(parsed.filters).toEqual({ department: 'eng' });
    });
  });

  describe('nlQuerySchema', () => {
    it('accepts a query of at least 5 characters', () => {
      const result = nlQuerySchema.safeParse({ query: 'How many employees are on leave?' });
      expect(result.success).toBe(true);
    });

    it('rejects a query shorter than 5 characters', () => {
      const result = nlQuerySchema.safeParse({ query: 'hi' });
      expect(result.success).toBe(false);
    });

    it('accepts a query of exactly 5 characters', () => {
      const result = nlQuerySchema.safeParse({ query: 'hello' });
      expect(result.success).toBe(true);
    });

    it('rejects a missing query field', () => {
      const result = nlQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
