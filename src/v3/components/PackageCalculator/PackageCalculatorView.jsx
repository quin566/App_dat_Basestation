import React, { useState, useMemo } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { calculateTaxes, formatCurrency } from '../../utils/taxEngine';
import { Camera, RotateCcw } from 'lucide-react';

// ─── Reusable input ────────────────────────────────────────────────────────────
const InputRow = ({ label, prefix, suffix, value, onChange, type = 'number', helpText, placeholder = '0' }) => (
  <div>
    <label className="text-xs font-bold text-[#8A7A6A] uppercase tracking-wider block mb-1.5">{label}</label>
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-[#8A7A6A] font-bold text-sm z-10">{prefix}</span>}
      <input
        type={type}
        value={value || ''}
        onChange={e =>
          onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)
        }
        className={`w-full py-2.5 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl font-bold text-[#2C2511]
          focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/40 transition
          ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-14' : 'pr-3'}`}
        placeholder={placeholder}
      />
      {suffix && (
        <span className="absolute right-3 text-[#8A7A6A] text-sm font-bold pointer-events-none">{suffix}</span>
      )}
    </div>
    {helpText && <p className="mt-1 text-[10px] text-[#9C8A7A]">{helpText}</p>}
  </div>
);

// ─── Result row ────────────────────────────────────────────────────────────────
const ResultRow = ({ label, value, accent, positive, negative }) => (
  <div className="flex justify-between items-center py-3 border-b border-[#F2EFE9] last:border-0">
    <span className={`text-sm ${accent ? 'font-black text-[#2C2511]' : 'font-medium text-[#8A7A6A]'}`}>
      {label}
    </span>
    <span
      className={`font-black ${accent ? 'text-base text-[#2C2511]' : ''}
        ${positive ? 'text-emerald-600' : ''}
        ${negative ? 'text-rose-500' : ''}`}
    >
      {value}
    </span>
  </div>
);

// ─── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, accentColor = 'bg-[#5F6F65]', children }) => (
  <div className="bg-white rounded-2xl border border-[#E8E4E1] shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-[#F2EFE9] flex items-center gap-3">
      <div className={`w-1.5 h-5 rounded-full ${accentColor}`} />
      <h3 className="font-black text-[#2C2511]">{title}</h3>
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </div>
);

// ─── Hourly rate sub-calculator ────────────────────────────────────────────────
const HourlyRate = ({ netProfit }) => {
  const [hours, setHours] = useState(8);
  const rate = hours > 0 ? netProfit / hours : 0;
  const color =
    rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="flex items-center gap-5">
      <div className="flex-1">
        <label className="text-xs font-bold text-[#8A7A6A] uppercase tracking-wider block mb-1.5">
          Total Hours (shoot + editing)
        </label>
        <input
          type="number"
          min={1}
          value={hours || ''}
          onChange={e => setHours(Math.max(1, parseFloat(e.target.value) || 1))}
          className="w-full py-2.5 px-3 bg-white border border-[#E8E4E1] rounded-xl font-bold text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/40"
        />
      </div>
      <div className="text-center min-w-[110px]">
        <div className={`text-3xl font-black ${color}`}>{formatCurrency(rate)}</div>
        <div className="text-xs text-[#8A7A6A] font-bold uppercase tracking-wider mt-0.5">/ hour net</div>
      </div>
    </div>
  );
};

// ─── Defaults ──────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  packageName: '',
  packagePrice: 0,
  useMileage: true,
  miles: 0,
  gasCost: 0,
  rentalCost: 0,
  lodgingNights: 0,
  lodgingRate: 0,
  flightCost: 0,
  flightBags: 0,
  secondShooter: 0,
  albumCost: 0,
  equipmentRental: 0,
  editingCost: 0,
  gratuities: 0,
  meals: 0,
  perDiemDays: 0,
  perDiemRate: 0,
  parking: 0,
  misc: 0,
};

// ─── Main view ─────────────────────────────────────────────────────────────────
const PackageCalculatorView = () => {
  const { state } = useAppState();
  const [form, setForm] = useState(EMPTY_FORM);

  const set = key => val => setForm(f => ({ ...f, [key]: val }));

  // Pull marginal + effective rates from the user's saved annual tax plan
  const { marginalRate, effectiveRate } = useMemo(
    () => calculateTaxes(Number(state.grossRevenue) || 0, Number(state.bizExpenses) || 0),
    [state.grossRevenue, state.bizExpenses]
  );

  const r = useMemo(() => {
    const {
      packagePrice, useMileage, miles, gasCost, rentalCost,
      lodgingNights, lodgingRate,
      flightCost, flightBags,
      secondShooter, albumCost,
      equipmentRental, editingCost,
      gratuities,
      meals, perDiemDays, perDiemRate,
      parking, misc,
    } = form;

    const lodgingTotal = lodgingNights * lodgingRate;
    const perDiemTotal = perDiemDays * perDiemRate;

    // ── Deductible amounts ────────────────────────────────────────────────────
    const deductions = {
      travel:        useMileage ? miles * 0.70 : gasCost + rentalCost,
      lodging:       lodgingTotal,              // 100%
      flight:        flightCost + flightBags,   // 100%
      secondShooter,                            // 100% (contractor)
      album:         albumCost,                 // 100%
      equipment:     equipmentRental,           // 100%
      editing:       editingCost,               // 100%
      meals:         meals * 0.50,              // 50% per IRS
      perDiem:       perDiemTotal * 0.50,       // 50% per IRS
      parking,                                  // 100%
      misc,                                     // 100%
    };
    const totalDeductible = Object.values(deductions).reduce((a, b) => a + b, 0);

    // ── Actual cash spent (out-of-pocket) ─────────────────────────────────────
    // Mileage mode: gas cost is implicitly covered by the IRS rate — not double-counted
    const cashCosts =
      (useMileage ? 0 : gasCost + rentalCost) +
      lodgingTotal +
      flightCost + flightBags +
      secondShooter + albumCost +
      equipmentRental + editingCost +
      gratuities +
      meals + perDiemTotal +
      parking + misc;

    const grossProfit   = packagePrice - cashCosts;
    const combinedRate  = marginalRate + 0.025; // fed marginal + AZ 2.5%
    const taxSavings    = totalDeductible * combinedRate;

    // Rough per-job income tax estimate using annual effective rate
    const jobTax        = Math.max(0, grossProfit * effectiveRate);
    const netProfit     = grossProfit - jobTax + taxSavings;
    const margin        = packagePrice > 0 ? (netProfit / packagePrice) * 100 : 0;

    return { cashCosts, grossProfit, totalDeductible, taxSavings, jobTax, netProfit, margin, deductions };
  }, [form, marginalRate, effectiveRate]);

  // Colour palette for margin score
  const marginPalette =
    r.margin >= 60
      ? { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', bar: 'bg-emerald-500', label: 'Strong Margin' }
      : r.margin >= 40
      ? { bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-500',   bar: 'bg-amber-500',   label: 'Moderate Margin' }
      : { bg: 'bg-rose-50 border-rose-200',      text: 'text-rose-500',    bar: 'bg-rose-500',    label: 'Tight Margin' };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <Camera size={14} />
          <span>Package Calculator</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">Package Profitability</h2>
            <p className="text-[#8A7A6A] mt-2 text-lg">
              Model any shoot — costs, write-offs, and true net — before you quote.
            </p>
          </div>
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="mt-2 flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#8A7A6A] border border-[#E8E4E1] rounded-xl hover:bg-[#F2EFE9] transition-colors shrink-0"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

        {/* ── LEFT: Inputs ─────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Package Details */}
          <Section title="Package Details">
            <InputRow
              label="Package / Event Name"
              type="text"
              value={form.packageName}
              onChange={set('packageName')}
              placeholder="e.g. Full-Day Wedding"
            />
            <InputRow
              label="Client Invoice Total"
              prefix="$"
              value={form.packagePrice}
              onChange={set('packagePrice')}
              helpText="The gross amount the client pays you."
            />
          </Section>

          {/* Travel & Logistics */}
          <Section title="Travel & Logistics" accentColor="bg-[#D4A373]">
            {/* Mileage / Actual toggle */}
            <div className="flex rounded-xl overflow-hidden border border-[#E8E4E1] text-sm">
              <button
                onClick={() => set('useMileage')(true)}
                className={`flex-1 py-2.5 font-bold transition-colors
                  ${form.useMileage ? 'bg-[#5F6F65] text-white' : 'bg-[#FAF8F3] text-[#8A7A6A] hover:bg-[#F2EFE9]'}`}
              >
                IRS Mileage Rate
              </button>
              <button
                onClick={() => set('useMileage')(false)}
                className={`flex-1 py-2.5 font-bold transition-colors
                  ${!form.useMileage ? 'bg-[#5F6F65] text-white' : 'bg-[#FAF8F3] text-[#8A7A6A] hover:bg-[#F2EFE9]'}`}
              >
                Actual Gas / Rental
              </button>
            </div>

            {form.useMileage ? (
              <InputRow
                label="Round-Trip Miles"
                suffix="mi"
                value={form.miles}
                onChange={set('miles')}
                helpText={`IRS rate $0.70 / mi → ${formatCurrency(form.miles * 0.70)} deductible`}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <InputRow label="Gas Cost" prefix="$" value={form.gasCost} onChange={set('gasCost')} helpText="100% deductible" />
                <InputRow label="Rental Car" prefix="$" value={form.rentalCost} onChange={set('rentalCost')} helpText="100% deductible" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <InputRow
                label="Lodging Nights"
                suffix="nights"
                value={form.lodgingNights}
                onChange={set('lodgingNights')}
                helpText="100% deductible"
              />
              <InputRow
                label="Rate / Night"
                prefix="$"
                value={form.lodgingRate}
                onChange={set('lodgingRate')}
                helpText="Hotel or Airbnb rate"
              />
            </div>

            {form.lodgingNights > 0 && form.lodgingRate > 0 && (
              <div className="flex justify-between items-center px-4 py-2.5 bg-[#FAF8F3] rounded-xl text-sm border border-[#E8E4E1]">
                <span className="text-[#8A7A6A] font-medium">Lodging Total</span>
                <span className="font-black text-[#2C2511]">
                  {formatCurrency(form.lodgingNights * form.lodgingRate)}
                </span>
              </div>
            )}

            {/* Flight fields */}
            <div className="grid grid-cols-2 gap-4">
              <InputRow
                label="Airfare"
                prefix="$"
                value={form.flightCost}
                onChange={set('flightCost')}
                helpText="Airline tickets — 100% deductible"
              />
              <InputRow
                label="Checked Bags / Fees"
                prefix="$"
                value={form.flightBags}
                onChange={set('flightBags')}
                helpText="100% deductible"
              />
            </div>

            {(form.flightCost > 0 || form.flightBags > 0) && (
              <div className="flex justify-between items-center px-4 py-2.5 bg-[#FAF8F3] rounded-xl text-sm border border-[#E8E4E1]">
                <span className="text-[#8A7A6A] font-medium">Flight Total</span>
                <span className="font-black text-[#2C2511]">
                  {formatCurrency(form.flightCost + form.flightBags)}
                </span>
              </div>
            )}
          </Section>

          {/* Package Costs */}
          <Section title="Package Costs" accentColor="bg-[#8A9EA4]">
            <div className="grid grid-cols-2 gap-4">
              <InputRow
                label="Second Shooter"
                prefix="$"
                value={form.secondShooter}
                onChange={set('secondShooter')}
                helpText="Contractor — 100% deductible"
              />
              <InputRow
                label="Album / Prints"
                prefix="$"
                value={form.albumCost}
                onChange={set('albumCost')}
                helpText="Product cost — 100% deductible"
              />
              <InputRow
                label="Equipment Rental"
                prefix="$"
                value={form.equipmentRental}
                onChange={set('equipmentRental')}
                helpText="Camera/lens/lighting — 100% deductible"
              />
              <InputRow
                label="Editing / Outsourcing"
                prefix="$"
                value={form.editingCost}
                onChange={set('editingCost')}
                helpText="Retouching/editing — 100% deductible"
              />
              <InputRow
                label="Travel Meals"
                prefix="$"
                value={form.meals}
                onChange={set('meals')}
                helpText="50% deductible per IRS"
              />
              <InputRow
                label="Gratuities"
                prefix="$"
                value={form.gratuities}
                onChange={set('gratuities')}
                helpText="Tips (not deductible)"
              />
            </div>

            {/* Per diem */}
            <div className="grid grid-cols-2 gap-4">
              <InputRow
                label="Per Diem Days"
                suffix="days"
                value={form.perDiemDays}
                onChange={set('perDiemDays')}
                helpText="50% deductible per IRS"
              />
              <InputRow
                label="Per Diem Rate"
                prefix="$"
                value={form.perDiemRate}
                onChange={set('perDiemRate')}
                helpText="Daily rate"
              />
            </div>

            {form.perDiemDays > 0 && form.perDiemRate > 0 && (
              <div className="flex justify-between items-center px-4 py-2.5 bg-[#FAF8F3] rounded-xl text-sm border border-[#E8E4E1]">
                <span className="text-[#8A7A6A] font-medium">Per Diem Total</span>
                <span className="font-black text-[#2C2511]">
                  {formatCurrency(form.perDiemDays * form.perDiemRate)}
                  <span className="text-[10px] text-[#9C8A7A] font-normal ml-1">
                    ({formatCurrency(form.perDiemDays * form.perDiemRate * 0.5)} deductible)
                  </span>
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <InputRow
                label="Parking / Tolls"
                prefix="$"
                value={form.parking}
                onChange={set('parking')}
                helpText="100% deductible"
              />
            </div>
            <InputRow
              label="Miscellaneous"
              prefix="$"
              value={form.misc}
              onChange={set('misc')}
              helpText="Permits, props, and other costs — 100% deductible"
            />
          </Section>
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Profitability Score */}
          {form.packagePrice > 0 && (
            <div className={`rounded-3xl p-7 border ${marginPalette.bg} flex items-center gap-6`}>
              <div className="text-center shrink-0">
                <div className={`text-5xl font-black ${marginPalette.text}`}>
                  {Math.round(r.margin)}%
                </div>
                <div className={`text-[10px] font-black uppercase tracking-wider mt-1 ${marginPalette.text}`}>
                  {marginPalette.label}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-[#2C2511] mb-1 truncate">
                  {form.packageName || 'This Package'}
                </div>
                <div className="text-xs text-[#8A7A6A]">Net margin after taxes &amp; write-offs</div>
                <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${marginPalette.bar}`}
                    style={{ width: `${Math.min(100, Math.max(0, r.margin))}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* P&L Summary */}
          <div className="bg-white rounded-2xl border border-[#E8E4E1] shadow-sm">
            <div className="px-6 py-4 border-b border-[#F2EFE9] flex items-center gap-3">
              <div className="w-1.5 h-5 bg-[#5F6F65] rounded-full" />
              <h3 className="font-black text-[#2C2511]">P&amp;L Summary</h3>
            </div>
            <div className="p-6">
              <ResultRow label="Package Revenue" value={formatCurrency(form.packagePrice)} />
              <ResultRow
                label="Out-of-Pocket Costs"
                value={r.cashCosts > 0 ? `— ${formatCurrency(r.cashCosts)}` : formatCurrency(0)}
                negative={r.cashCosts > 0}
              />
              <ResultRow label="Gross Profit" value={formatCurrency(r.grossProfit)} accent />
              <ResultRow
                label={`Est. Income Tax (${Math.round(effectiveRate * 100)}% effective rate)`}
                value={r.jobTax > 0 ? `— ${formatCurrency(r.jobTax)}` : formatCurrency(0)}
                negative={r.jobTax > 0}
              />
              <ResultRow
                label="Write-off Tax Savings"
                value={r.taxSavings > 0 ? `+ ${formatCurrency(r.taxSavings)}` : formatCurrency(0)}
                positive={r.taxSavings > 0}
              />
              <div className="mt-4 pt-4 border-t-2 border-[#E8E4E1] flex justify-between items-center">
                <span className="font-black text-[#2C2511] text-base">Net After Tax</span>
                <span
                  className={`text-2xl font-black ${r.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                >
                  {formatCurrency(r.netProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Write-off Breakdown */}
          {r.totalDeductible > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E4E1] shadow-sm">
              <div className="px-6 py-4 border-b border-[#F2EFE9] flex items-center gap-3">
                <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                <h3 className="font-black text-[#2C2511]">Write-off Breakdown</h3>
                <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {formatCurrency(r.taxSavings)} saved
                </span>
              </div>
              <div className="p-6">
                {r.deductions.travel > 0 && (
                  <ResultRow
                    label={form.useMileage ? `Mileage (${form.miles} mi @ $0.70)` : 'Gas + Rental Car'}
                    value={formatCurrency(r.deductions.travel)}
                    positive
                  />
                )}
                {r.deductions.lodging > 0 && (
                  <ResultRow
                    label={`Lodging (${form.lodgingNights} night${form.lodgingNights !== 1 ? 's' : ''})`}
                    value={formatCurrency(r.deductions.lodging)}
                    positive
                  />
                )}
                {r.deductions.flight > 0 && (
                  <ResultRow
                    label="Airfare &amp; Bags"
                    value={formatCurrency(r.deductions.flight)}
                    positive
                  />
                )}
                {r.deductions.secondShooter > 0 && (
                  <ResultRow label="Second Shooter (contractor)" value={formatCurrency(r.deductions.secondShooter)} positive />
                )}
                {r.deductions.album > 0 && (
                  <ResultRow label="Album / Prints" value={formatCurrency(r.deductions.album)} positive />
                )}
                {r.deductions.equipment > 0 && (
                  <ResultRow label="Equipment Rental" value={formatCurrency(r.deductions.equipment)} positive />
                )}
                {r.deductions.editing > 0 && (
                  <ResultRow label="Editing / Outsourcing" value={formatCurrency(r.deductions.editing)} positive />
                )}
                {r.deductions.meals > 0 && (
                  <ResultRow
                    label={`Travel Meals (50% of ${formatCurrency(form.meals)})`}
                    value={formatCurrency(r.deductions.meals)}
                    positive
                  />
                )}
                {r.deductions.perDiem > 0 && (
                  <ResultRow
                    label={`Per Diem (50% of ${formatCurrency(form.perDiemDays * form.perDiemRate)})`}
                    value={formatCurrency(r.deductions.perDiem)}
                    positive
                  />
                )}
                {r.deductions.parking > 0 && (
                  <ResultRow label="Parking / Tolls" value={formatCurrency(r.deductions.parking)} positive />
                )}
                {r.deductions.misc > 0 && (
                  <ResultRow label="Miscellaneous" value={formatCurrency(r.deductions.misc)} positive />
                )}
                <div className="mt-4 pt-3 border-t-2 border-[#E8E4E1] flex justify-between items-center">
                  <span className="font-black text-[#2C2511]">Total Deductible</span>
                  <span className="text-lg font-black text-emerald-700">{formatCurrency(r.totalDeductible)}</span>
                </div>
                <p className="mt-3 text-[10px] text-[#9C8A7A] leading-relaxed">
                  Savings calculated at your estimated{' '}
                  {Math.round((marginalRate + 0.025) * 100)}% combined marginal rate
                  (federal {Math.round(marginalRate * 100)}% + AZ 2.5%), based on your Tax Planner numbers.
                </p>
              </div>
            </div>
          )}

          {/* Effective Hourly Rate */}
          <div className="bg-[#F2EFE9] rounded-2xl border border-[#E8E4E1] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-5 bg-[#5F6F65] rounded-full" />
              <h3 className="font-black text-[#2C2511]">Effective Hourly Rate</h3>
            </div>
            <HourlyRate netProfit={r.netProfit} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageCalculatorView;
