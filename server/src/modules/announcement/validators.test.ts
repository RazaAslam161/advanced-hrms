import { announcementSchema } from './validators';

describe('announcementSchema', () => {
  const validPayload = {
    title: 'Team Outing',
    content: 'Join us for the annual team outing this Friday.',
  };

  it('accepts a valid announcement payload', () => {
    const result = announcementSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('defaults audience to all', () => {
    const parsed = announcementSchema.parse(validPayload);
    expect(parsed.audience).toBe('all');
  });

  it('defaults published to false', () => {
    const parsed = announcementSchema.parse(validPayload);
    expect(parsed.published).toBe(false);
  });

  it('accepts audience value of department', () => {
    const result = announcementSchema.safeParse({ ...validPayload, audience: 'department', department: 'dept-001' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid audience value', () => {
    const result = announcementSchema.safeParse({ ...validPayload, audience: 'team' });
    expect(result.success).toBe(false);
  });

  it('rejects a title shorter than 3 characters', () => {
    const result = announcementSchema.safeParse({ ...validPayload, title: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects content shorter than 10 characters', () => {
    const result = announcementSchema.safeParse({ ...validPayload, content: 'Short' });
    expect(result.success).toBe(false);
  });

  it('accepts published: true', () => {
    const parsed = announcementSchema.parse({ ...validPayload, published: true });
    expect(parsed.published).toBe(true);
  });

  it('accepts an optional department field', () => {
    const parsed = announcementSchema.parse({ ...validPayload, department: 'dept-123' });
    expect(parsed.department).toBe('dept-123');
  });

  it('rejects a missing title', () => {
    const result = announcementSchema.safeParse({ content: validPayload.content });
    expect(result.success).toBe(false);
  });
});
