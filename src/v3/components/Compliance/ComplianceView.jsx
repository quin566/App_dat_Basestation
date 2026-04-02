import React, { useMemo } from 'react';
import { useAppState } from '../../contexts/StateContext';
import ChecklistItem from './ChecklistItem';
import { ShieldCheck } from 'lucide-react';

const COMPLIANCE_ITEMS = [
  {
    id: 'c1', q: 'Q1 (Jan–Mar)', text: 'Pay Q4 estimated taxes',
    sub: 'Federal: Jan 15 | AZ: Jan 15 (Form 1040-ES & AZ 140ES)',
    detailedGuide: `1. Log in to IRS Direct Pay (directpay.irs.gov) — no account needed.\n2. Select "Estimated Tax" as the reason, tax year, and enter the amount from your Tax Planner.\n3. For Arizona: pay at AZTaxes.gov using Form AZ 140ES.\n4. Screenshot both confirmations and save them in your tax folder.\n\nTip: Pay the full Q4 amount by Jan 15 to avoid underpayment penalties.`,
  },
  {
    id: 'c2', q: 'Q1 (Jan–Mar)', text: 'Reconcile January bank statement',
    sub: 'Match every transaction to a receipt or invoice',
    detailedGuide: `1. Download your January bank/card statement as a PDF.\n2. In this app, verify every transaction has the correct category — look for any "Other" entries.\n3. For each expense over $75, confirm you have a receipt saved (IRS requirement).\n4. Mark any personal charges that need to be removed from business books.\n5. Note any missing invoices and follow up with clients.\n\nGoal: zero unexplained "Other" transactions by month-end.`,
  },
  {
    id: 'c3', q: 'Q1 (Jan–Mar)', text: 'Issue 1099-NEC to contractors ($600+)',
    sub: 'Due January 31 — use IRS FIRE system or payroll software',
    detailedGuide: `1. Pull a list of all contractors paid $600+ during the year (use the 1099 Monitor in Tax Planner).\n2. Collect a Form W-9 from each contractor if you don't already have one.\n3. File 1099-NEC forms via: Track1099, Tax1099, or your payroll software (e.g., QuickBooks).\n4. File Copy A with the IRS and send Copy B to each contractor — both due January 31.\n5. Keep copies for your records for at least 4 years.\n\nPenalty for missing the deadline: $50–$290 per form.`,
  },
  {
    id: 'c4', q: 'Q2 (Apr–Jun)', text: 'File annual tax return (or extension)',
    sub: 'Federal Form 1040 + AZ Form 140 — due April 15',
    detailedGuide: `1. Gather: all 1099s received, your P&L export from this app, mileage log, home office measurements.\n2. Use a CPA (recommended for self-employed with $50k+ income) or TurboTax Self-Employed.\n3. File Schedule C (business income) and Schedule SE (self-employment tax) with your 1040.\n4. For Arizona: file Form 140 — AZ conforms to federal AGI with minor adjustments.\n5. If not ready, file Form 4868 (federal) and AZ Form 204 for a 6-month extension to file (NOT to pay — estimated taxes are still due April 15).\n\nUse the Tax Export CSV in this app to give your CPA a clean category breakdown.`,
  },
  {
    id: 'c5', q: 'Q2 (Apr–Jun)', text: 'Pay Q1 estimated taxes',
    sub: 'Federal: April 15 | AZ: April 15',
    detailedGuide: `1. Calculate: your estimated annual tax ÷ 4 = Q1 payment.\n2. Pay federal at IRS Direct Pay (directpay.irs.gov) — select "Estimated Tax."\n3. Pay Arizona at AZTaxes.gov — select "Individual Estimated Tax Payment."\n4. Save your confirmation numbers.\n\nSafe harbor tip: If you pay at least 100% of last year's tax (110% if income > $150k), you avoid underpayment penalties regardless of what you owe.`,
  },
  {
    id: 'c6', q: 'Q2 (Apr–Jun)', text: 'Reconcile Q1 bank statements',
    sub: 'January, February, March',
    detailedGuide: `1. Download statements for all business accounts: checking, savings, business credit cards.\n2. In this app, use the filter to show Jan–Mar transactions and verify all are categorized.\n3. Export the Q1 P&L and compare gross income to what clients paid you — resolve any gaps.\n4. Ensure every receipt for expenses > $75 is saved digitally (IRS requires it).\n5. Note your Q1 net profit — this feeds your Q1 estimated tax payment.`,
  },
  {
    id: 'c7', q: 'Q3 (Jul–Sep)', text: 'Pay Q2 estimated taxes',
    sub: 'Federal: June 16 | AZ: June 16',
    detailedGuide: `1. Review your YTD income in the Tax Planner.\n2. Pay 25% of your estimated annual tax for Q2 by June 16.\n3. Federal: IRS Direct Pay — select "Estimated Tax," period "Q2."\n4. Arizona: AZTaxes.gov — "Individual Estimated Tax."\n5. If Q2 was a high-revenue season (spring weddings!), consider paying slightly more to stay ahead.`,
  },
  {
    id: 'c8', q: 'Q3 (Jul–Sep)', text: 'Reconcile Q2 bank statements',
    sub: 'April, May, June',
    detailedGuide: `1. Pull April, May, June statements for all accounts.\n2. Verify all bookings, retainers, and final payments are logged as Income (not Transfer).\n3. Check that second-shooter and editor payments are categorized as Contractors.\n4. Confirm any gear purchases have receipts.\n5. Run the P&L export and compare to your Q2 invoices — flag any discrepancies.`,
  },
  {
    id: 'c9', q: 'Q3 (Jul–Sep)', text: 'Renew TPT license (if selling prints)',
    sub: 'Annual renewal at azdor.gov — usually $12',
    detailedGuide: `Arizona Transaction Privilege Tax (TPT) applies if you sell physical prints or albums to clients.\n\n1. Log in to AZTaxes.gov with your TPT license credentials.\n2. Select "Renew License" — it's $12/year.\n3. Verify your business address and contact info are current.\n4. If you only shoot and deliver digitally, you likely don't need a TPT license — confirm with your CPA.\n\nNote: If you collect sales tax on print orders, make sure you're remitting it monthly or quarterly as required.`,
  },
  {
    id: 'c10', q: 'Q4 (Oct–Dec)', text: 'Pay Q3 estimated taxes',
    sub: 'Federal: Sept 15 | AZ: Sept 15',
    detailedGuide: `1. Review your Jan–Aug income and run an updated tax projection in the Tax Planner.\n2. Pay Q3 installment (25% of annual estimate) by September 15.\n3. Federal: IRS Direct Pay — "Estimated Tax," Q3.\n4. Arizona: AZTaxes.gov — "Individual Estimated Tax."\n5. Fall is a good time to make a large gear or education purchase if you're over income thresholds — consult your CPA.`,
  },
  {
    id: 'c11', q: 'Q4 (Oct–Dec)', text: 'Reconcile Q3 bank statements',
    sub: 'July, August, September',
    detailedGuide: `1. Download July–September statements.\n2. Verify summer sessions, mini-session income, and any travel photography payments are all categorized as Income.\n3. Reconcile any venue or location fees as Studio/Rent.\n4. Check that quarterly software subscriptions (Honeybook, Adobe, etc.) are properly categorized.\n5. Run a year-to-date P&L and compare to your income target to plan Q4 bookings.`,
  },
  {
    id: 'c12', q: 'Annual', text: 'Confirm statutory agent is current',
    sub: 'Check AZ ACC (azcc.gov) — no annual report required in AZ ✅',
    detailedGuide: `Arizona LLCs do not file annual reports (unlike most states), but you must maintain a statutory agent.\n\n1. Go to azcc.gov → "Search Business Entities" → find your LLC.\n2. Confirm your statutory agent name and address are accurate.\n3. If you changed your address or agent this year, file an update using the AZ CC online portal (small fee).\n4. Make sure your registered agent can receive legal service of process at that address year-round.\n\nUsing yourself as agent? Make sure your address is always current.`,
  },
  {
    id: 'c13', q: 'Annual', text: 'Review & update LLC Operating Agreement',
    sub: 'Especially if income or business structure changed this year',
    detailedGuide: `Your Operating Agreement is your LLC's internal rulebook — Arizona doesn't require filing it, but you need one to protect your corporate veil.\n\nReview these sections annually:\n1. Member ownership percentages (did anything change?)\n2. How profits/losses are distributed\n3. Decision-making authority (what requires member vote?)\n4. Buy-sell provisions (what happens if you add a partner?)\n5. Business purpose clause — make sure it still reflects your services\n\nIf you made structural changes this year, have an attorney update the agreement. Store a signed copy in your business records folder.`,
  },
  {
    id: 'c14', q: 'Annual', text: 'Max out SEP-IRA before April 15',
    sub: 'Deadline for prior year — most powerful tax lever you have',
    detailedGuide: `A SEP-IRA lets you contribute up to 25% of net self-employment income (max $69,000 for 2024) and deduct it dollar-for-dollar from your taxable income.\n\n1. Open a SEP-IRA at Fidelity, Vanguard, or Schwab (free, takes 10 minutes).\n2. Calculate your max contribution: (Net Profit − ½ SE Tax) × 20%.\n3. Contribute any amount up to that limit — even $1,000 saves real money.\n4. Deadline: your tax filing deadline including extensions (usually Oct 15 if you filed an extension).\n5. Report the contribution on Schedule 1, Line 16 of your 1040.\n\nExample: $60k net profit → ~$11,100 max contribution → ~$3,300 in federal/SE tax savings.`,
  },
];

const ComplianceView = () => {
  const { state, updateState } = useAppState();
  const checks = state.complianceChecks || {};

  const handleToggle = (id, checked) => {
    updateState({ complianceChecks: { ...checks, [id]: checked } });
  };

  const grouped = useMemo(() => {
    return COMPLIANCE_ITEMS.reduce((acc, item) => {
      if (!acc[item.q]) acc[item.q] = [];
      acc[item.q].push(item);
      return acc;
    }, {});
  }, []);

  const total = COMPLIANCE_ITEMS.length;
  const done = COMPLIANCE_ITEMS.filter(i => checks[i.id]).length;
  const score = Math.round((done / total) * 100);

  const scoreColor = score === 100
    ? 'text-[#4A6657]'
    : score >= 50
    ? 'text-amber-600'
    : 'text-rose-600';

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header data-tour="compliance-status">
        <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <ShieldCheck size={14} />
          <span>Compliance</span>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">Corporate Veil Score</h2>
        <p className="text-[#8A7A6A] mt-2 text-lg">Keep your LLC airtight and tax-ready all year.</p>
      </header>

      {/* Score Card */}
      <div className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm flex items-center gap-8">
        <div className="text-center">
          <p className={`text-7xl font-black ${scoreColor}`}>{score}%</p>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9C8A7A] mt-1">Compliance Score</p>
        </div>
        <div className="flex-1">
          <div className="h-4 bg-[#F2EFE9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${score}%`,
                background: score === 100 ? '#4A6657' : score >= 50 ? '#D97706' : '#DC2626'
              }}
            />
          </div>
          <p className="text-sm text-[#8A7A6A] mt-3 font-medium">{done} of {total} items complete</p>
          {score === 100 && (
            <p className="text-sm font-bold text-[#4A6657] mt-1">🎉 Your corporate veil is fully protected!</p>
          )}
        </div>
      </div>

      {/* Grouped Checklists */}
      {Object.entries(grouped).map(([quarter, items]) => {
        const quarterDone = items.filter(i => checks[i.id]).length;
        return (
          <div key={quarter}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="inline-block px-3 py-1 bg-[#EEF2F0] text-[#5F6F65] text-[11px] font-black uppercase tracking-widest rounded-full">
                  {quarter}
                </span>
              </div>
              <span className="text-xs font-bold text-[#9C8A7A]">{quarterDone}/{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map(item => (
                <ChecklistItem
                  key={item.id}
                  id={item.id}
                  text={item.text}
                  sub={item.sub}
                  done={!!checks[item.id]}
                  onToggle={handleToggle}
                  detailedGuide={item.detailedGuide}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ComplianceView;
