import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { calculateTaxes, formatCurrency } from '../../utils/taxEngine';
import QuarterlyTracker from './QuarterlyTracker';
import { Calculator, Car, Home, Package, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

// --- Write-off Input Card ---
const WriteoffCard = ({ icon: Icon, label, value, onChange, prefix = '$', suffix = '', max, helpText }) => (
  <div className="bg-white rounded-2xl p-6 border border-[#E8E4E1] shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65]">
        <Icon size={18} />
      </div>
      <span className="text-sm font-bold text-[#5F6F65]">{label}</span>
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
const DeductionRow = ({ label, value, accent = false }) => (
  <div className={`flex justify-between items-center py-3.5 border-b border-[#F2EFE9] last:border-0 ${accent ? 'text-[#5F6F65]' : ''}`}>
    <span className={`text-sm font-medium ${accent ? 'font-bold' : 'text-[#8A7A6A]'}`}>{label}</span>
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

  // Save inputs to state on change
  const save = useCallback(() => {
    updateState({
      grossRevenue: gross,
      bizExpenses: expenses,
      writeoffs: { miles, sqft }
    });
  }, [gross, expenses, miles, sqft, updateState]);

  const finances = useMemo(() => calculateTaxes(gross, expenses), [gross, expenses]);

  const mileageDeduction = miles * 0.70;
  const homeOfficeDeduction = Math.min(sqft, 300) * 6;
  const totalAdditionalDeductions = mileageDeduction + homeOfficeDeduction;

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
      <div className="bg-[#F2EFE9] rounded-3xl p-8 border border-[#E8E4E1]">
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
          <DeductionRow label="SE Tax Deduction (½)" value={`— ${formatCurrency(finances.seTax / 2)}`} />
          <DeductionRow label="QBI Deduction (20%)" value={`— ${formatCurrency(finances.qbiDeduct)}`} />
          <DeductionRow label="Estimated Total Tax" value={formatCurrency(finances.totalTax)} />
          <DeductionRow label="Take-Home Pay" value={formatCurrency(finances.takehome)} accent />
        </div>
        <button
          onClick={save}
          className="mt-6 px-6 py-3 bg-[#5F6F65] text-white font-bold rounded-xl text-sm hover:bg-[#4A6657] transition-colors active:scale-95"
        >
          Save Numbers
        </button>
      </div>

      {/* Write-off Calculators */}
      <div>
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
            helpText={`At $0.70/mi = ${formatCurrency(mileageDeduction)} deduction`}
          />
          <WriteoffCard
            icon={Home}
            label="Home Office (sq ft)"
            value={sqft}
            onChange={setSqft}
            prefix=""
            suffix="sqft"
            max={300}
            helpText={`IRS Simplified: $6/sqft (300 max) = ${formatCurrency(homeOfficeDeduction)}`}
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
      <ROIAnalyzer marginalRate={finances.marginalRate} />

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
