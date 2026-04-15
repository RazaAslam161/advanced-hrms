export interface SalaryComponents {
  basic: number;
  houseRent: number;
  medical: number;
  transport: number;
  bonus: number;
  deductions: number;
  advances: number;
  providentFund: number;
  loanDeduction: number;
}

export interface PayrollComputation extends SalaryComponents {
  grossSalary: number;
  tax: number;
  netSalary: number;
}

interface TaxSlab {
  min: number;
  max: number | null;
  fixedTax: number;
  rate: number;
  base: number;
}

const pakistanSalarySlabs: TaxSlab[] = [
  { min: 0, max: 600000, fixedTax: 0, rate: 0, base: 0 },
  { min: 600001, max: 1200000, fixedTax: 0, rate: 0.05, base: 600000 },
  { min: 1200001, max: 2200000, fixedTax: 30000, rate: 0.15, base: 1200000 },
  { min: 2200001, max: 3200000, fixedTax: 180000, rate: 0.25, base: 2200000 },
  { min: 3200001, max: 4100000, fixedTax: 430000, rate: 0.3, base: 3200000 },
  { min: 4100001, max: null, fixedTax: 700000, rate: 0.35, base: 4100000 },
];

export const computePakistanAnnualTax = (annualTaxableIncome: number): number => {
  const slab = pakistanSalarySlabs.find(
    (item) => annualTaxableIncome >= item.min && (item.max === null || annualTaxableIncome <= item.max),
  );

  if (!slab) {
    return 0;
  }

  return slab.fixedTax + Math.max(annualTaxableIncome - slab.base, 0) * slab.rate;
};

export const computePayroll = (components: SalaryComponents, country: 'Pakistan' | 'UAE'): PayrollComputation => {
  const grossSalary = components.basic + components.houseRent + components.medical + components.transport + components.bonus;
  const annualTaxableIncome = grossSalary * 12;
  const tax = country === 'Pakistan' ? computePakistanAnnualTax(annualTaxableIncome) / 12 : 0;
  const netSalary =
    grossSalary -
    tax -
    components.deductions -
    components.advances -
    components.providentFund -
    components.loanDeduction;

  return {
    ...components,
    grossSalary,
    tax,
    netSalary,
  };
};
