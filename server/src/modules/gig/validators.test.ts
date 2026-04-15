import { gigSchema } from './validators';

describe('gigSchema', () => {
  const validPayload = {
    title: 'React Developer',
    description: 'Build and maintain the front-end components.',
    ownerId: 'user-001',
  };

  it('accepts a valid gig payload', () => {
    const result = gigSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('defaults skillTags to an empty array', () => {
    const parsed = gigSchema.parse(validPayload);
    expect(parsed.skillTags).toEqual([]);
  });

  it('defaults status to open', () => {
    const parsed = gigSchema.parse(validPayload);
    expect(parsed.status).toBe('open');
  });

  it('accepts all valid status values', () => {
    const statuses = ['open', 'inProgress', 'completed', 'closed'] as const;
    for (const status of statuses) {
      expect(gigSchema.safeParse({ ...validPayload, status }).success).toBe(true);
    }
  });

  it('rejects an invalid status', () => {
    const result = gigSchema.safeParse({ ...validPayload, status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('rejects a title shorter than 3 characters', () => {
    const result = gigSchema.safeParse({ ...validPayload, title: 'JS' });
    expect(result.success).toBe(false);
  });

  it('rejects a description shorter than 10 characters', () => {
    const result = gigSchema.safeParse({ ...validPayload, description: 'Short' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing ownerId', () => {
    const { ownerId: _, ...rest } = validPayload;
    const result = gigSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('accepts an optional department', () => {
    const parsed = gigSchema.parse({ ...validPayload, department: 'dept-001' });
    expect(parsed.department).toBe('dept-001');
  });

  it('accepts skillTags array with values', () => {
    const parsed = gigSchema.parse({ ...validPayload, skillTags: ['React', 'TypeScript'] });
    expect(parsed.skillTags).toEqual(['React', 'TypeScript']);
  });
});
