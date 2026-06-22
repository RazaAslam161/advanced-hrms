import { leaveApplySchema, leaveDecisionSchema } from './validators';

describe('leave validators', () => {
  describe('leaveApplySchema', () => {
    const validPayload = {
      leaveType: 'casual',
      startDate: '2026-05-01T00:00:00.000Z',
      endDate: '2026-05-03T00:00:00.000Z',
      reason: 'Family event',
    };

    it('accepts a valid leave application', () => {
      const result = leaveApplySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('defaults halfDay to false', () => {
      const parsed = leaveApplySchema.parse(validPayload);
      expect(parsed.halfDay).toBe(false);
    });

    it('accepts an explicit halfDay: true', () => {
      const parsed = leaveApplySchema.parse({ ...validPayload, halfDay: true });
      expect(parsed.halfDay).toBe(true);
    });

    it('rejects an invalid leaveType', () => {
      const result = leaveApplySchema.safeParse({ ...validPayload, leaveType: 'study' });
      expect(result.success).toBe(false);
    });

    it('accepts an optional employeeId', () => {
      const parsed = leaveApplySchema.parse({ ...validPayload, employeeId: 'emp-123' });
      expect(parsed.employeeId).toBe('emp-123');
    });

    it('rejects a reason shorter than 5 characters', () => {
      const result = leaveApplySchema.safeParse({ ...validPayload, reason: 'ok' });
      expect(result.success).toBe(false);
    });

    it('rejects a non-ISO-datetime startDate', () => {
      const result = leaveApplySchema.safeParse({ ...validPayload, startDate: '2026-05-01' });
      expect(result.success).toBe(false);
    });

    it('accepts all valid leave types', () => {
      const types = ['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity'] as const;
      for (const leaveType of types) {
        expect(leaveApplySchema.safeParse({ ...validPayload, leaveType }).success).toBe(true);
      }
    });
  });

  describe('leaveDecisionSchema', () => {
    it('accepts an approved status', () => {
      const result = leaveDecisionSchema.safeParse({ status: 'approved' });
      expect(result.success).toBe(true);
    });

    it('accepts a rejected status with a reason', () => {
      const result = leaveDecisionSchema.safeParse({ status: 'rejected', rejectionReason: 'Insufficient leave balance' });
      expect(result.success).toBe(true);
    });

    it('accepts rejected without a rejection reason (optional)', () => {
      const result = leaveDecisionSchema.safeParse({ status: 'rejected' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid status value', () => {
      const result = leaveDecisionSchema.safeParse({ status: 'pending' });
      expect(result.success).toBe(false);
    });
  });
});
