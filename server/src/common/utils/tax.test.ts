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
});
