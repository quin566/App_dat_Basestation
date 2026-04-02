// Financial calculation engine — pure functions, no side effects
import { calculateTaxes } from './taxEngine';
import { SCHEDULE_C_MAP } from './categorizer';

/**
 * Build a full P&L breakdown from a transaction array.
 * @param {Array} transactions
 * @returns {{ months: Array, ytd: Object, allTime: Object }}
 */
export const buildPL = (transactions = []) => {
  const byMonth = {};

  for (const txn of transactions) {
    const month = (txn.date || '').slice(0, 7); // 'YYYY-MM'
    if (!month) continue;

    if (!byMonth[month]) {
      byMonth[month] = {
        month,
        grossIncome: 0,
        otherDeposits: 0,
        totalExpenses: 0,
        netProfit: 0,
        expensesByCategory: {},
      };
    }

    const m = byMonth[month];
    if (txn.amount > 0) {
      if (txn.category === 'Income') {
        m.grossIncome += txn.amount;
      } else {
        m.otherDeposits += txn.amount;
      }
    } else {
      const expense = Math.abs(txn.amount);
      m.totalExpenses += expense;
      const cat = txn.category || 'Other';
      m.expensesByCategory[cat] = (m.expensesByCategory[cat] || 0) + expense;
    }
  }

  // Compute netProfit for each month
  const months = Object.values(byMonth)
    .map((m) => ({ ...m, netProfit: m.grossIncome - m.totalExpenses }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // YTD = current calendar year
  const currentYear = new Date().getFullYear().toString();
  const ytdMonths = months.filter((m) => m.month.startsWith(currentYear));
  const ytd = ytdMonths.reduce(
    (acc, m) => {
      acc.grossIncome += m.grossIncome;
      acc.otherDeposits += m.otherDeposits;
      acc.totalExpenses += m.totalExpenses;
      acc.netProfit += m.netProfit;
      for (const [cat, amt] of Object.entries(m.expensesByCategory)) {
        acc.expensesByCategory[cat] = (acc.expensesByCategory[cat] || 0) + amt;
      }
      return acc;
    },
    { grossIncome: 0, otherDeposits: 0, totalExpenses: 0, netProfit: 0, expensesByCategory: {} }
  );

  const allTime = months.reduce(
    (acc, m) => ({
      grossIncome: acc.grossIncome + m.grossIncome,
      otherDeposits: acc.otherDeposits + m.otherDeposits,
      totalExpenses: acc.totalExpenses + m.totalExpenses,
      netProfit: acc.netProfit + m.netProfit,
    }),
    { grossIncome: 0, otherDeposits: 0, totalExpenses: 0, netProfit: 0 }
  );

  return { months, ytd, allTime };
};

/**
 * Revenue predictions using linear regression + seasonal indexing.
 * @param {Array} transactions
 * @param {3|6|12} horizonMonths
 */
export const predictRevenue = (transactions = [], horizonMonths = 6) => {
  const { months } = buildPL(transactions);
  const historical = months.map((m) => ({ month: m.month, actual: m.grossIncome }));

  if (historical.length < 2) {
    return {
      historical,
      predicted: [],
      annualizedRun: historical[0]?.actual * 12 || 0,
      trend: 'flat',
      confidence: 'low',
    };
  }

  // Linear regression on index → income
  const n = historical.length;
  const xs = historical.map((_, i) => i);
  const ys = historical.map((h) => h.actual);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const avgIncome = sumY / n;

  // Seasonal indices per calendar month (1–12)
  const seasonalSums = {};
  const seasonalCounts = {};
  for (const h of historical) {
    const calMonth = parseInt(h.month.slice(5, 7), 10);
    seasonalSums[calMonth] = (seasonalSums[calMonth] || 0) + h.actual;
    seasonalCounts[calMonth] = (seasonalCounts[calMonth] || 0) + 1;
  }
  const seasonalIndex = {};
  for (let m = 1; m <= 12; m++) {
    if (seasonalCounts[m]) {
      seasonalIndex[m] = (seasonalSums[m] / seasonalCounts[m]) / (avgIncome || 1);
    } else {
      seasonalIndex[m] = 1;
    }
  }

  // Build prediction array
  const lastMonthStr = historical[historical.length - 1].month;
  const [lastYear, lastMon] = lastMonthStr.split('-').map(Number);
  const predicted = [];
  for (let i = 1; i <= horizonMonths; i++) {
    let mon = lastMon + i;
    let yr = lastYear;
    while (mon > 12) { mon -= 12; yr += 1; }
    const monthStr = `${yr}-${String(mon).padStart(2, '0')}`;
    const projectedBase = intercept + slope * (n - 1 + i);
    const raw = Math.max(0, projectedBase * (seasonalIndex[mon] || 1));
    predicted.push({ month: monthStr, predicted: Math.round(raw) });
  }

  const trend = slope > avgIncome * 0.01 ? 'up' : slope < -avgIncome * 0.01 ? 'down' : 'flat';
  const confidence = n >= 6 ? 'high' : n >= 3 ? 'medium' : 'low';
  const annualizedRun = Math.round(avgIncome * 12);

  return { historical, predicted, annualizedRun, trend, confidence };
};

/**
 * Derive tax liability from YTD transactions.
 */
export const deriveTaxLiability = (transactions = []) => {
  const { ytd } = buildPL(transactions);
  // Convert cents to dollars for taxEngine (taxEngine expects dollar amounts)
  const grossDollars = ytd.grossIncome / 100;
  const expDollars = ytd.totalExpenses / 100;

  if (grossDollars === 0) {
    return {
      totalTax: 0,
      selfEmploymentTax: 0,
      federalTax: 0,
      stateTax: 0,
      quarterlyEstimate: 0,
      netProfit: 0,
    };
  }

  const taxes = calculateTaxes(grossDollars, expDollars);
  const monthsElapsed = Math.max(1, new Date().getMonth() + 1);
  const quarterlyEstimate = Math.round((taxes.totalTax / monthsElapsed) * 3);

  return { ...taxes, quarterlyEstimate };
};

/**
 * Top expense categories sorted by total.
 */
export const getTopExpenseCategories = (transactions = [], limit = 5) => {
  const totals = {};
  let grandTotal = 0;
  for (const txn of transactions) {
    if (txn.amount < 0) {
      const amt = Math.abs(txn.amount);
      const cat = txn.category || 'Other';
      totals[cat] = (totals[cat] || 0) + amt;
      grandTotal += amt;
    }
  }
  return Object.entries(totals)
    .map(([category, total]) => ({ category, total, pct: grandTotal > 0 ? total / grandTotal : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};

/**
 * Month-over-month change between the last two complete months.
 */
export const getMonthOverMonthChange = (months = []) => {
  if (months.length < 2) return { incomeChange: 0, expenseChange: 0, netChange: 0 };
  const prev = months[months.length - 2];
  const curr = months[months.length - 1];
  const pct = (curr, prev) => prev === 0 ? 0 : ((curr - prev) / Math.abs(prev)) * 100;
  return {
    incomeChange: pct(curr.grossIncome, prev.grossIncome),
    expenseChange: pct(curr.totalExpenses, prev.totalExpenses),
    netChange: pct(curr.netProfit, prev.netProfit),
  };
};

/** Format cents to readable dollar string */
export const centsToDisplay = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

/** Profit margin as a percentage. */
export const getProfitMargin = (pl) => {
  if (!pl.ytd.grossIncome) return 0;
  return (pl.ytd.netProfit / pl.ytd.grossIncome) * 100;
};

/**
 * Cash runway in months based on bank balances vs average monthly burn.
 */
export const getRunway = (transactions = [], bankAccounts = []) => {
  const cashCents = bankAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const { months } = buildPL(transactions);
  if (months.length === 0) return { months: null, cashCents, avgBurnCents: 0 };
  const recent = months.slice(-3);
  const avgBurnCents = recent.reduce((s, m) => s + m.totalExpenses, 0) / recent.length;
  if (avgBurnCents === 0) return { months: null, cashCents, avgBurnCents: 0 };
  return { months: Math.round(cashCents / avgBurnCents), cashCents, avgBurnCents };
};

/**
 * Top merchants by total spend (expenses only).
 */
export const getTopMerchants = (transactions = [], limit = 10) => {
  const totals = {}, counts = {}, cats = {};
  for (const txn of transactions) {
    if (txn.amount >= 0) continue;
    const key = (txn.description || 'Unknown').split(/\s+/).slice(0, 4).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Unknown';
    const amt = Math.abs(txn.amount);
    totals[key] = (totals[key] || 0) + amt;
    counts[key] = (counts[key] || 0) + 1;
    if (!cats[key]) cats[key] = txn.category || 'Other';
  }
  return Object.entries(totals)
    .map(([name, total]) => ({ name, total, count: counts[name], category: cats[name] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};

/** Export transactions to a CSV string (includes Schedule C line for CPA filing). */
export const exportCSV = (transactions = []) => {
  const header = ['Date', 'Description', 'Amount', 'Category', 'Schedule C Line', 'Source', 'Notes'];
  const rows = transactions.map(t => [
    t.date || '',
    `"${(t.description || '').replace(/"/g, '""')}"`,
    (t.amount / 100).toFixed(2),
    t.category || '',
    `"${SCHEDULE_C_MAP[t.category] || 'Line 27a — Other Expenses'}"`,
    t.source || '',
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
};
