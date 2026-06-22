import { payrollRunSchema, payrollDecisionSchema, loanAdvanceSchema } from './validators';

describe('payroll validators', () => {
  describe('payrollRunSchema', () => {
    it('accepts a valid payroll run payload', () => {
      const result = payrollRunSchema.safeParse({ month: 'April', year: 2026 });
      expect(result.success).toBe(true);
    });

    it('accepts an optional notes field', () => {
      const result = payrollRunSchema.safeParse({ month: 'April', year: 2026, notes: 'Bonus included' });
      expect(result.success).toBe(true);
    });

    it('rejects a month shorter than 3 characters', () => {
      const result = payrollRunSchema.safeParse({ month: 'Ap', year: 2026 });
      expect(result.success).toBe(false);
    });

    it('rejects a year before 2024', () => {
      const result = payrollRunSchema.safeParse({ month: 'April', year: 2023 });
      expect(result.success).toBe(false);
    });

    it('accepts the minimum year of 2024', () => {
      const result = payrollRunSchema.safeParse({ month: 'January', year: 2024 });
      expect(result.success).toBe(true);
    });
  });

  describe('payrollDecisionSchema', () => {
    it('accepts approved status', () => {
      const result = payrollDecisionSchema.safeParse({ status: 'approved' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid status', () => {
      const result = payrollDecisionSchema.safeParse({ status: 'rejected' });
      expect(result.success).toBe(false);
    });

    it('rejects a missing status', () => {
      const result = payrollDecisionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('loanAdvanceSchema', () => {
    const validLoan = {
      employeeId: 'emp-001',
      type: 'loan',
      amount: 50000,
      monthlyDeduction: 5000,
    };

    it('accepts a valid loan record', () => {
      const result = loanAdvanceSchema.safeParse(validLoan);
      expect(result.success).toBe(true);
    });

    it('accepts advance type', () => {
      const result = loanAdvanceSchema.safeParse({ ...validLoan, type: 'advance' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid type', () => {
      const result = loanAdvanceSchema.safeParse({ ...validLoan, type: 'grant' });
      expect(result.success).toBe(false);
    });

    it('rejects an amount of 0', () => {
      const result = loanAdvanceSchema.safeParse({ ...validLoan, amount: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects a monthlyDeduction of 0', () => {
      const result = loanAdvanceSchema.safeParse({ ...validLoan, monthlyDeduction: 0 });
      expect(result.success).toBe(false);
    });
  });
});
