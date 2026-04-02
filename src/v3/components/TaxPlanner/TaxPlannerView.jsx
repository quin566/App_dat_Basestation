import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { calculateTaxes, formatCurrency } from '../../utils/taxEngine';
import QuarterlyTracker from './QuarterlyTracker';
import {
  Calculator, Car, Home, Package, TrendingDown,
  ChevronDown, ChevronUp, Info, ExternalLink,
  Download, AlertTriangle, Users,
} from 'lucide-react';

// --- Info Tooltip with Source Link ---
const InfoTooltip = ({ tooltip }) => {
  const [show, setShow] = useState(false);

  const openLink = (e) => {
    e.stopPropagation();
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(tooltip.href);
    } else {
      window.open(tooltip.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <span
      className="relative inline-flex items-center ml-1.5 shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label={`More info: ${tooltip.text}`}
    >
      <Info size={13} className="text-[#B0A090] cursor-help hover:text-[#5F6F65] transition-colors focus:outline-none" />
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#2C2511] text-[#FAF8F3] text-xs rounded-xl p-3 shadow-xl z-50 leading-relaxed font-medium pointer-events-auto">
          <p>{tooltip.text}</p>
          {tooltip.href && (
            <button
              onClick={openLink}
              className="mt-2 flex items-center gap-1.5 text-[#9FBD9A] hover:text-white transition-colors font-bold"
            >
              <ExternalLink size={11} /> Source
            </button>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#2C2511]" />
        </div>
      )}
    </span>
  );
};

// --- Write-off Input Card ---
const WriteoffCard = ({ icon: Icon, label, value, onChange, prefix = '$', suffix = '', max, helpText, tooltip }) => (
  <div className="bg-white rounded-2xl p-6 border border-[#E8E4E1] shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]">
        <Icon size={18} />
      </div>
      <span className="text-sm font-bold text-[#5F6F65] flex items-center">
        {label}
        {tooltip && <InfoTooltip tooltip={tooltip} />}
      </span>
    </div>
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-4 text-[#8A7A6A] font-bold">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        max={max}
        className="w-full bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl py-3 text-[#2C2511] font-black text-lg focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/40 transition pl-8 pr-4"
        placeholder="0"
      />
      {suffix && <span className="absolute right-4 text-[#8A7A6A] font-bold text-sm">{suffix}</span>}
    </div>
    {helpText && <p className="mt-2 text-[10px] text-[#9C8A7A]">{helpText}</p>}
  </div>
);

// --- Deduction Result Row ---
const DeductionRow = ({ label, value, accent = false, tooltip }) => (
  <div className={`flex justify-between items-center py-3.5 border-b border-[#F2EFE9] last:border-0 ${accent ? 'text-[#5F6F65]' : ''}`}>
    <span className={`text-sm font-medium flex items-center ${accent ? 'font-bold' : 'text-[#8A7A6A]'}`}>
      {label}
      {tooltip && <InfoTooltip tooltip={tooltip} />}
    </span>
    <span className={`font-black text-base ${accent ? 'text-[#2C2511] text-lg' : 'text-[#332F2E]'}`}>{value}</span>
  </div>
);

// --- ROI Analyzer ---
const ROIAnalyzer = ({ marginalRate }) => {
  const [cost, setCost] = useState(0);
  const [deductPct, setDeductPct] = useState(1);

  const deductibleAmt = cost * deductPct;
  const savings = deductibleAmt * (marginalRate + 0.025);
  const trueCost = cost - savings;

  return (
    <div className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm">
      <h3 className="text-lg font-black mb-6 flex items-center gap-3">
        <div className="w-1.5 h-5 bg-[#D4A373] rounded-full" />
        ROI Purchase Analyzer
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold text-[#8A7A6A] uppercase tracking-wider block mb-2">Item Cost</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A6A] font-bold">$</span>
            <input
              type="number"
              value={cost || ''}
              onChange={e => setCost(parseFloat(e.target.value) || 0)}
              className="w-full pl-7 pr-3 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl font-bold text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/40"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-[#8A7A6A] uppercase tracking-wider block mb-2">Deductible</label>
          <select
            value={deductPct}
            onChange={e => setDeductPct(parseFloat(e.target.value))}
            className="w-full px-3 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl font-bold text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/40"
          >
            <option value={1}>100% — Full Business Use</option>
            <option value={0.5}>50% — Mixed Use</option>
            <option value={0}>0% — Not Deductible</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-xs font-black uppercase text-emerald-600 tracking-wider">Tax Saved</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">+{formatCurrency(savings)}</p>
        </div>
        <div className="bg-[#FAF8F3] border border-[#E8E4E1] rounded-2xl p-5">
          <p className="text-xs font-black uppercase text-[#8A7A6A] tracking-wider">True Cost</p>
          <p className="text-2xl font-black text-[#2C2511] mt-1">{formatCurrency(trueCost)}</p>
        </div>
      </div>
    </div>
  );
};

// --- Main Tax Planner View ---
const TaxPlannerView = () => {
  const { state, updateState } = useAppState();
  const [gross, setGross] = useState(state.grossRevenue || 95000);
  const [expenses, setExpenses] = useState(state.bizExpenses || 25000);
  const [miles, setMiles] = useState(state.writeoffs?.miles || 0);
  const [sqft, setSqft] = useState(state.writeoffs?.sqft || 0);
  const [showTracker, setShowTracker] = useState(true);

  const save = useCallback(() => {
    updateState({
      grossRevenue: gross,
      bizExpenses: expenses,
      writeoffs: { miles, sqft }
    });
  }, [gross, expenses, miles, sqft, updateState]);

  const finances = useMemo(() => calculateTaxes(gross, expenses), [gross, expenses]);

  const mileageDeduction = miles * 0.67;
  const homeOfficeDeduction = Math.min(sqft, 300) * 5;
  const totalAdditionalDeductions = mileageDeduction + homeOfficeDeduction;

  // ── 1099-NEC Monitor ─────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear().toString();
  const contractorTotals = useMemo(() => {
    const totals = {};
    for (const txn of (state.transactions || [])) {
      if (txn.amount >= 0) continue;
      if (txn.category !== 'Contractors') continue;
      if (!(txn.date || '').startsWith(currentYear)) continue;
      const key = (txn.description || 'Unknown')
        .split(/\s+/).slice(0, 4).join(' ')
        .replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Unknown';
      totals[key] = (totals[key] || 0) + Math.abs(txn.amount);
    }
    return Object.entries(totals)
      .map(([name, total]) => ({ name, total }))
      .filter(v => v.total > 60000) // $600 threshold in cents
      .sort((a, b) => b.total - a.total);
  }, [state.transactions, currentYear]);

  // ── CPA Tax Export ────────────────────────────────────────────────────────────
  const handleTaxExport = useCallback(() => {
    const txns = state.transactions || [];
    const ytdTxns = txns.filter(t => (t.date || '').startsWith(currentYear));

    const grouped = {};
    for (const txn of ytdTxns) {
      const cat = txn.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(txn);
    }

    const lines = [
      `"YTD Tax Export — ${currentYear}"`,
      `"Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"`,
      '',
      'Category,Date,Description,Amount',
    ];

    const categoryOrder = ['Income', 'Equipment', 'Software', 'Marketing', 'Travel',
      'Contractors', 'Insurance', 'Studio / Rent', 'Education', 'Meals', 'Taxes',
      'Transfer', 'Refund', 'Interest', 'Tax Refund', 'Other'];

    const sortedCategories = [
      ...categoryOrder.filter(c => grouped[c]),
      ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)).sort(),
    ];

    for (const cat of sortedCategories) {
      const catTxns = (grouped[cat] || []).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const subtotal = catTxns.reduce((s, t) => s + t.amount, 0);
      for (const t of catTxns) {
        lines.push(`"${cat}","${t.date || ''}","${(t.description || '').replace(/"/g, '""')}",${(t.amount / 100).toFixed(2)}`);
      }
      lines.push(`"${cat} — SUBTOTAL","","",${(subtotal / 100).toFixed(2)}`);
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-export-${currentYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.transactions, currentYear]);

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-2">
        <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <Calculator size={14} />
          <span>Tax Planner</span>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">Your Tax Strategy</h2>
        <p className="text-[#8A7A6A] mt-2 text-lg">Adjust your numbers. See your savings in real time.</p>
      </header>

      {/* Income & Expense Inputs */}
      <div data-tour="income-overview" className="bg-[#F2EFE9] rounded-3xl p-8 border border-[#E8E4E1]">
        <h3 className="text-lg font-black mb-6 flex items-center gap-3">
          <div className="w-1.5 h-5 bg-[#5F6F65] rounded-full" />
          Income Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WriteoffCard
            icon={TrendingDown}
            label="Gross Revenue"
            value={gross}
            onChange={setGross}
            helpText="Total income before any deductions."
          />
          <WriteoffCard
            icon={Package}
            label="Business Expenses"
            value={expenses}
            onChange={setExpenses}
            helpText="Software, gear, marketing, contractors, etc."
          />
        </div>
        <div className="mt-6 bg-white rounded-2xl p-6 border border-[#E8E4E1]">
          <DeductionRow label="Gross Revenue" value={formatCurrency(gross)} />
          <DeductionRow label="Business Expenses" value={`— ${formatCurrency(expenses)}`} />
          <DeductionRow
            label="SE Tax Deduction (½)"
            value={`— ${formatCurrency(finances.seTax / 2)}`}
            tooltip={{
              text: "15.3% tax (12.4% SS + 2.9% Medicare) on 92.35% of net profit. Half is deductible from income.",
              href: "https://www.irs.gov/taxtopics/tc554",
            }}
          />
          <DeductionRow
            label="QBI Deduction (20%)"
            value={`— ${formatCurrency(finances.qbiDeduct)}`}
            tooltip={{
              text: "20% deduction for eligible pass-through income (sole proprietors, S-corps, partnerships).",
              href: "https://www.irs.gov/newsroom/qualified-business-income-deduction",
            }}
          />
          <DeductionRow
            label="AZ Flat Tax (2.5%)"
            value={formatCurrency(finances.azTax)}
            tooltip={{
              text: "Arizona flat 2.5% individual income tax rate as of 2023.",
              href: "https://azdor.gov/individual-income-tax",
            }}
          />
          <DeductionRow label="Estimated Total Tax" value={formatCurrency(finances.totalTax)} />
          <DeductionRow label="Take-Home Pay" value={formatCurrency(finances.takehome)} accent />
        </div>
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <button
            onClick={save}
            className="px-6 py-3 bg-[#5F6F65] text-white font-bold rounded-xl text-sm hover:bg-[#4A6657] transition-colors active:scale-95"
          >
            Save Numbers
          </button>
          <button
            onClick={handleTaxExport}
            className="flex items-center gap-2 px-6 py-3 border border-[#5F6F65] text-[#5F6F65] font-bold rounded-xl text-sm hover:bg-[#EEF2F0] transition-colors active:scale-95"
          >
            <Download size={15} /> Tax Export (CSV)
          </button>
        </div>
      </div>

      {/* Write-off Calculators */}
      <div data-tour="writeoffs">
        <h3 className="text-lg font-black mb-5 flex items-center gap-3">
          <div className="w-1.5 h-5 bg-[#D4A373] rounded-full" />
          Additional Write-offs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WriteoffCard
            icon={Car}
            label="Business Miles Driven"
            value={miles}
            onChange={setMiles}
            prefix=""
            suffix="mi"
            helpText={`At $0.67/mi = ${formatCurrency(mileageDeduction)} deduction`}
            tooltip={{
              text: "IRS 2024 standard mileage rate: 67¢/mile.",
              href: "https://www.irs.gov/newsroom/irs-issues-standard-mileage-rates-for-2024",
            }}
          />
          <WriteoffCard
            icon={Home}
            label="Home Office (sq ft)"
            value={sqft}
            onChange={setSqft}
            prefix=""
            suffix="sqft"
            max={300}
            helpText={`IRS Simplified: $5/sqft (300 max) = ${formatCurrency(homeOfficeDeduction)}`}
            tooltip={{
              text: "Simplified Method: $5/sqft, up to 300 sqft ($1,500 max). Ref: IRS Pub 587.",
              href: "https://www.irs.gov/businesses/small-businesses-self-employed/simplified-option-for-home-office-deduction",
            }}
          />
        </div>
        {totalAdditionalDeductions > 0 && (
          <div className="mt-4 flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <span className="text-sm font-bold text-emerald-700">Additional Deductions:</span>
            <span className="font-black text-emerald-800">{formatCurrency(totalAdditionalDeductions)}</span>
            <span className="text-xs text-emerald-600 ml-auto">≈ {formatCurrency(totalAdditionalDeductions * (finances.marginalRate + 0.025))} in tax savings</span>
          </div>
        )}
      </div>

      {/* ROI Analyzer */}
      <div data-tour="roi-analyzer">
        <ROIAnalyzer marginalRate={finances.marginalRate} />
      </div>

      {/* 1099-NEC Monitor */}
      <div>
        <h3 className="text-lg font-black mb-5 flex items-center gap-3">
          <div className="w-1.5 h-5 bg-[#C4847A] rounded-full" />
          1099-NEC Monitor
          <span className="text-xs font-bold text-[#9C8A7A] normal-case ml-1">{currentYear} YTD</span>
        </h3>
        {contractorTotals.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm flex items-center gap-4 text-[#9C8A7A]">
            <Users size={20} className="opacity-40 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#2C2511]">No 1099 filings required yet</p>
              <p className="text-xs mt-0.5">Contractors will appear here once cumulative payments exceed $600 in {currentYear}.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E8E4E1] shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <p className="text-sm font-bold text-amber-800">
                {contractorTotals.length} contractor{contractorTotals.length > 1 ? 's' : ''} require{contractorTotals.length === 1 ? 's' : ''} a 1099-NEC — due January 31
              </p>
            </div>
            <div className="divide-y divide-[#F5F2EF]">
              {contractorTotals.map(({ name, total }) => (
                <div key={name} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-bold text-[#2C2511]">{name}</p>
                    <p className="text-[11px] text-[#9C8A7A] mt-0.5">Collect W-9 · File via IRS FIRE or Track1099</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#C4847A]">{formatCurrency(total / 100)}</p>
                    <p className="text-[10px] text-[#9C8A7A] uppercase tracking-wider mt-0.5">YTD Paid</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quarterly Tracker */}
      <div>
        <button
          onClick={() => setShowTracker(v => !v)}
          className="w-full flex items-center justify-between text-left mb-5"
        >
          <h3 className="text-lg font-black flex items-center gap-3">
            <div className="w-1.5 h-5 bg-[#5F6F65] rounded-full" />
            Quarterly Payment Tracker
          </h3>
          <span className="text-[#8A7A6A]">{showTracker ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</span>
        </button>
        {showTracker && <QuarterlyTracker annualTax={finances.totalTax} />}
      </div>
    </div>
  );
};

export default TaxPlannerView;
