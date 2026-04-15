import { computePakistanAnnualTax, computePayroll } from './tax';

describe('tax utilities', () => {
  it('computes annual Pakistan salaried tax for an income in the second slab', () => {
    expect(computePakistanAnnualTax(900000)).toBe(15000);
  });

  it('computes UAE payroll without income tax', () => {
    const payroll = computePayroll(
      {
        basic: 100000,
        houseRent: 20000,
        medical: 5000,
        transport: 5000,
        bonus: 10000,
        deductions: 2000,
        advances: 1000,
        providentFund: 0,
        loanDeduction: 0,
      },
      'UAE',
    );

    expect(payroll.tax).toBe(0);
    expect(payroll.netSalary).toBe(137000);
  });

  describe('computePakistanAnnualTax – all slabs', () => {
    it('returns 0 for income in the zero-tax slab (≤ 600,000)', () => {
      expect(computePakistanAnnualTax(0)).toBe(0);
      expect(computePakistanAnnualTax(600000)).toBe(0);
    });

    it('computes correct tax for an income at the top of the second slab (1,200,000)', () => {
      // fixedTax=0, rate=0.05, base=600000 → (1200000 - 600000) * 0.05 = 30000
      expect(computePakistanAnnualTax(1200000)).toBe(30000);
    });

    it('computes correct tax for an income in the third slab (1,700,000)', () => {
      // fixedTax=30000, rate=0.15, base=1200000 → 30000 + (1700000 - 1200000) * 0.15 = 30000 + 75000 = 105000
      expect(computePakistanAnnualTax(1700000)).toBe(105000);
    });

    it('computes correct tax at the top of the third slab (2,200,000)', () => {
      // 30000 + (2200000 - 1200000) * 0.15 = 30000 + 150000 = 180000
      expect(computePakistanAnnualTax(2200000)).toBe(180000);
    });

    it('computes correct tax for an income in the fourth slab (2,700,000)', () => {
      // fixedTax=180000, rate=0.25, base=2200000 → 180000 + (2700000 - 2200000) * 0.25 = 180000 + 125000 = 305000
      expect(computePakistanAnnualTax(2700000)).toBe(305000);
    });

    it('computes correct tax for an income in the fifth slab (3,500,000)', () => {
      // fixedTax=430000, rate=0.30, base=3200000 → 430000 + (3500000 - 3200000) * 0.30 = 430000 + 90000 = 520000
      expect(computePakistanAnnualTax(3500000)).toBe(520000);
    });

    it('computes correct tax for an income above the highest slab (5,000,000)', () => {
      // fixedTax=700000, rate=0.35, base=4100000 → 700000 + (5000000 - 4100000) * 0.35 = 700000 + 315000 = 1015000
      expect(computePakistanAnnualTax(5000000)).toBe(1015000);
    });
  });

  describe('computePayroll', () => {
    const baseComponents = {
      basic: 80000,
      houseRent: 20000,
      medical: 5000,
      transport: 5000,
      bonus: 0,
      deductions: 1000,
      advances: 500,
      providentFund: 0,
      loanDeduction: 0,
    };

    it('calculates gross salary as the sum of basic, allowances and bonus', () => {
      const payroll = computePayroll(baseComponents, 'UAE');
      expect(payroll.grossSalary).toBe(110000);
    });

    it('applies Pakistan income tax and deducts it from net salary', () => {
      // grossSalary = 110000; annualTaxable = 110000 * 12 = 1320000 (third slab)
      // annual tax = 30000 + (1320000 - 1200000) * 0.15 = 30000 + 18000 = 48000; monthly = 4000
      const payroll = computePayroll(baseComponents, 'Pakistan');
      expect(payroll.tax).toBe(4000);
      expect(payroll.netSalary).toBe(110000 - 4000 - 1000 - 500);
    });

    it('preserves original components in the returned object', () => {
      const payroll = computePayroll(baseComponents, 'UAE');
      expect(payroll.basic).toBe(80000);
      expect(payroll.deductions).toBe(1000);
    });

    it('deducts providentFund and loanDeduction from net salary', () => {
      const components = { ...baseComponents, providentFund: 2000, loanDeduction: 3000 };
      const payroll = computePayroll(components, 'UAE');
      expect(payroll.netSalary).toBe(110000 - 0 - 1000 - 500 - 2000 - 3000);
    });
  });
});
