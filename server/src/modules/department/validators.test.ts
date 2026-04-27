import { departmentBodySchema } from './validators';

describe('departmentBodySchema', () => {
  const validPayload = {
    name: 'Engineering',
    code: 'ENG',
  };

  it('accepts a valid department payload', () => {
    const result = departmentBodySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('defaults status to active', () => {
    const parsed = departmentBodySchema.parse(validPayload);
    expect(parsed.status).toBe('active');
  });

  it('accepts status value of inactive', () => {
    const result = departmentBodySchema.safeParse({ ...validPayload, status: 'inactive' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = departmentBodySchema.safeParse({ ...validPayload, status: 'archived' });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = departmentBodySchema.safeParse({ ...validPayload, name: 'E' });
    expect(result.success).toBe(false);
  });

  it('rejects a code shorter than 2 characters', () => {
    const result = departmentBodySchema.safeParse({ ...validPayload, code: 'E' });
    expect(result.success).toBe(false);
  });

  it('rejects a code longer than 10 characters', () => {
    const result = departmentBodySchema.safeParse({ ...validPayload, code: 'ENGINEERING1' });
    expect(result.success).toBe(false);
  });

  it('accepts an optional description', () => {
    const parsed = departmentBodySchema.parse({ ...validPayload, description: 'Software engineering team' });
    expect(parsed.description).toBe('Software engineering team');
  });

  it('accepts an optional head field', () => {
    const parsed = departmentBodySchema.parse({ ...validPayload, head: 'user-123' });
    expect(parsed.head).toBe('user-123');
  });

  it('accepts an optional parentDepartment field', () => {
    const parsed = departmentBodySchema.parse({ ...validPayload, parentDepartment: 'dept-001' });
    expect(parsed.parentDepartment).toBe('dept-001');
  });

  it('rejects a missing name', () => {
    const result = departmentBodySchema.safeParse({ code: 'ENG' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing code', () => {
    const result = departmentBodySchema.safeParse({ name: 'Engineering' });
    expect(result.success).toBe(false);
  });
});
