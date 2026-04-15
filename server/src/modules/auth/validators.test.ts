import { registerSchema, loginSchema, changePasswordSchema, transferSuperAdminSchema, userAccessSchema, mfaVerifySchema } from './validators';

describe('auth validators', () => {
  describe('loginSchema', () => {
    it('accepts a valid email and password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
      expect(result.success).toBe(false);
    });

    it('rejects a missing password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
      expect(result.success).toBe(false);
    });

    it('accepts an optional 6-digit MFA token', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret', mfaToken: '123456' });
      expect(result.success).toBe(true);
    });

    it('rejects a non-6-digit MFA token', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret', mfaToken: '12345' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validRegister = {
      email: 'raza@example.com',
      role: 'employee',
      firstName: 'Raza',
      lastName: 'Aslam',
      designation: 'Engineer',
    };

    it('accepts a valid registration payload', () => {
      const result = registerSchema.safeParse(validRegister);
      expect(result.success).toBe(true);
    });

    it('requires firstName to be at least 2 characters', () => {
      const result = registerSchema.safeParse({ ...validRegister, firstName: 'R' });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid role', () => {
      const result = registerSchema.safeParse({ ...validRegister, role: 'god' });
      expect(result.success).toBe(false);
    });

    it('rejects a password shorter than 10 characters', () => {
      const result = registerSchema.safeParse({ ...validRegister, password: 'Short1' });
      expect(result.success).toBe(false);
    });

    it('rejects a password without an uppercase letter', () => {
      const result = registerSchema.safeParse({ ...validRegister, password: 'alllowercase1' });
      expect(result.success).toBe(false);
    });

    it('rejects a password without a number', () => {
      const result = registerSchema.safeParse({ ...validRegister, password: 'AllLettersOnly' });
      expect(result.success).toBe(false);
    });

    it('normalizes an empty string department to undefined', () => {
      const parsed = registerSchema.parse({ ...validRegister, department: '' });
      expect(parsed.department).toBeUndefined();
    });

    it('keeps a non-empty department string', () => {
      const parsed = registerSchema.parse({ ...validRegister, department: 'dept-id-123' });
      expect(parsed.department).toBe('dept-id-123');
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts valid current and new passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'NewPassword1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a new password shorter than 10 characters', () => {
      const result = changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'Short1A' });
      expect(result.success).toBe(false);
    });

    it('rejects an empty current password', () => {
      const result = changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'NewPassword1' });
      expect(result.success).toBe(false);
    });
  });

  describe('transferSuperAdminSchema', () => {
    it('accepts valid current password and target user ID', () => {
      const result = transferSuperAdminSchema.safeParse({ currentPassword: 'pass', targetUserId: 'user-123' });
      expect(result.success).toBe(true);
    });

    it('rejects when targetUserId is missing', () => {
      const result = transferSuperAdminSchema.safeParse({ currentPassword: 'pass', targetUserId: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('userAccessSchema', () => {
    it('accepts an empty object (all fields optional)', () => {
      const result = userAccessSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts permissions array and isActive flag', () => {
      const result = userAccessSchema.safeParse({ permissions: ['read:users'], isActive: false });
      expect(result.success).toBe(true);
    });

    it('rejects isActive as a non-boolean', () => {
      const result = userAccessSchema.safeParse({ isActive: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  describe('mfaVerifySchema', () => {
    it('accepts a 6-digit token', () => {
      const result = mfaVerifySchema.safeParse({ token: '654321' });
      expect(result.success).toBe(true);
    });

    it('rejects tokens that are not exactly 6 digits', () => {
      expect(mfaVerifySchema.safeParse({ token: '12345' }).success).toBe(false);
      expect(mfaVerifySchema.safeParse({ token: '1234567' }).success).toBe(false);
    });
  });
});
