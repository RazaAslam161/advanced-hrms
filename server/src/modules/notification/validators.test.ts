import { notificationPreferenceSchema, notificationReadSchema } from './validators';

describe('notification validators', () => {
  describe('notificationPreferenceSchema', () => {
    const validPreferences = {
      leave: { email: true, inApp: true },
      payroll: { email: false, inApp: true },
      review: { email: true, inApp: false },
      announcement: { email: true, inApp: true },
      system: { email: false, inApp: false },
    };

    it('accepts a valid preferences payload', () => {
      const result = notificationPreferenceSchema.safeParse({ preferences: validPreferences });
      expect(result.success).toBe(true);
    });

    it('rejects a missing preferences object', () => {
      const result = notificationPreferenceSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects preferences missing a required category', () => {
      const { leave: _, ...rest } = validPreferences;
      const result = notificationPreferenceSchema.safeParse({ preferences: rest });
      expect(result.success).toBe(false);
    });

    it('rejects a non-boolean email value', () => {
      const result = notificationPreferenceSchema.safeParse({
        preferences: { ...validPreferences, leave: { email: 'yes', inApp: true } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-boolean inApp value', () => {
      const result = notificationPreferenceSchema.safeParse({
        preferences: { ...validPreferences, system: { email: false, inApp: 1 } },
      });
      expect(result.success).toBe(false);
    });

    it('preserves all preference values correctly', () => {
      const parsed = notificationPreferenceSchema.parse({ preferences: validPreferences });
      expect(parsed.preferences.leave.email).toBe(true);
      expect(parsed.preferences.payroll.inApp).toBe(true);
      expect(parsed.preferences.system.email).toBe(false);
    });
  });

  describe('notificationReadSchema', () => {
    it('accepts read: true', () => {
      const result = notificationReadSchema.safeParse({ read: true });
      expect(result.success).toBe(true);
    });

    it('accepts read: false', () => {
      const result = notificationReadSchema.safeParse({ read: false });
      expect(result.success).toBe(true);
    });

    it('rejects a non-boolean read value', () => {
      const result = notificationReadSchema.safeParse({ read: 'yes' });
      expect(result.success).toBe(false);
    });

    it('rejects a missing read field', () => {
      const result = notificationReadSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
