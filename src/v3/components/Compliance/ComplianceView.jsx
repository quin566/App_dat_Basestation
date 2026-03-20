import React, { useMemo } from 'react';
import { useAppState } from '../../contexts/StateContext';
import ChecklistItem from './ChecklistItem';
import { ShieldCheck } from 'lucide-react';

const COMPLIANCE_ITEMS = [
  { id: 'c1',  q: 'Q1 (Jan–Mar)',   text: 'Pay Q4 estimated taxes',              sub: 'Federal: Jan 15 | AZ: Jan 15 (Form 1040-ES & AZ 140ES)' },
  { id: 'c2',  q: 'Q1 (Jan–Mar)',   text: 'Reconcile January bank statement',    sub: 'Match every transaction to a receipt or invoice' },
  { id: 'c3',  q: 'Q1 (Jan–Mar)',   text: 'Issue 1099-NEC to contractors ($600+)', sub: 'Due January 31 — use IRS FIRE system or payroll software' },
  { id: 'c4',  q: 'Q2 (Apr–Jun)',   text: 'File annual tax return (or extension)', sub: 'Federal Form 1040 + AZ Form 140 — due April 15' },
  { id: 'c5',  q: 'Q2 (Apr–Jun)',   text: 'Pay Q1 estimated taxes',              sub: 'Federal: April 15 | AZ: April 15' },
  { id: 'c6',  q: 'Q2 (Apr–Jun)',   text: 'Reconcile Q1 bank statements',        sub: 'January, February, March' },
  { id: 'c7',  q: 'Q3 (Jul–Sep)',   text: 'Pay Q2 estimated taxes',              sub: 'Federal: June 16 | AZ: June 16' },
  { id: 'c8',  q: 'Q3 (Jul–Sep)',   text: 'Reconcile Q2 bank statements',        sub: 'April, May, June' },
  { id: 'c9',  q: 'Q3 (Jul–Sep)',   text: 'Renew TPT license (if selling prints)', sub: 'Annual renewal at azdor.gov — usually $12' },
  { id: 'c10', q: 'Q4 (Oct–Dec)',   text: 'Pay Q3 estimated taxes',              sub: 'Federal: Sept 15 | AZ: Sept 15' },
  { id: 'c11', q: 'Q4 (Oct–Dec)',   text: 'Reconcile Q3 bank statements',        sub: 'July, August, September' },
  { id: 'c12', q: 'Annual',         text: 'Confirm statutory agent is current',  sub: 'Check AZ ACC (azcc.gov) — no annual report required in AZ ✅' },
  { id: 'c13', q: 'Annual',         text: 'Review & update LLC Operating Agreement', sub: 'Especially if income or business structure changed this year' },
  { id: 'c14', q: 'Annual',         text: 'Max out SEP-IRA before April 15',    sub: 'Deadline for prior year — most powerful tax lever you have' },
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
