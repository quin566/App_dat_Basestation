/**
 * Tax Calculation Engine (Ported from V2)
 * Handles SE Tax, Federal Brackets (2025/2026), and AZ State Tax.
 */

export const calculateTaxes = (gross, expenses) => {
  const netProfit = Math.max(0, gross - expenses);
  
  // 1. Self-Employment Tax (15.3% of 92.35% of net)
  const seTaxable = netProfit * 0.9235;
  const seTax = seTaxable * 0.153;
  const seDeduct = seTax / 2;

  // 2. Adjustments (Health, Retirement - Placeholders for now)
  const healthAct = 0;
  const retireActual = 0;

  // 3. Federal Taxable Income (Simplified)
  const standardDeduct = 15000; // 2025 approx
  const agi = Math.max(0, netProfit - seDeduct - healthAct - retireActual);
  
  // QBI (20% of net profit, simplified)
  const qbiDeduct = netProfit * 0.20;
  const fedTaxable = Math.max(0, agi - standardDeduct - qbiDeduct);

  // 4. Federal Brackets (2025/2026)
  const brackets = [
    { max: 11925, rate: 0.10 },
    { max: 48475, rate: 0.12 },
    { max: 103350, rate: 0.22 },
    { max: 197300, rate: 0.24 },
    { max: 250525, rate: 0.32 },
    { max: 626350, rate: 0.35 },
    { max: Infinity, rate: 0.37 }
  ];

  let fedTax = 0;
  let prev = 0;
  let marginalRate = 0;

  for (const b of brackets) {
    if (fedTaxable <= 0) break;
    const taxableRange = Math.min(fedTaxable, b.max) - prev;
    if (taxableRange > 0) {
      fedTax += taxableRange * b.rate;
      marginalRate = b.rate;
    }
    prev = b.max;
  }

  // 5. Arizona State Tax (Flat 2.5%)
  const azTax = agi * 0.025;

  const totalTax = seTax + fedTax + azTax;
  const takehome = netProfit - totalTax;
  const effectiveRate = netProfit > 0 ? (totalTax / netProfit) : 0;
  const totalSaved = (seDeduct + qbiDeduct + healthAct + retireActual) * (marginalRate + 0.025);

  return {
    netProfit,
    seTax,
    fedTax,
    azTax,
    totalTax,
    takehome,
    effectiveRate,
    marginalRate,
    totalSaved,
    qbiDeduct
  };
};

export const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};
