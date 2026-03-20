import React from 'react';
import { useAppState } from '../../contexts/StateContext';
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';

const QuarterlyTracker = ({ annualTax }) => {
  const { state, updateState } = useAppState();
  const qPay = Math.round((Number.isFinite(Number(annualTax)) ? Number(annualTax) : 0) / 4);
  const now = new Date();
  const year = now.getFullYear();

  const quarters = [
    { q: `Q1 ${year}`, fed: `April 15, ${year}`, az: `April 15, ${year}`, isoDate: `${year}-04-15` },
    { q: `Q2 ${year}`, fed: `June 16, ${year}`, az: `June 16, ${year}`, isoDate: `${year}-06-16` },
    { q: `Q3 ${year}`, fed: `Sept 15, ${year}`, az: `Sept 15, ${year}`, isoDate: `${year}-09-15` },
    { q: `Q4 ${year}`, fed: `Jan 15, ${year + 1}`, az: `Jan 15, ${year + 1}`, isoDate: `${year + 1}-01-15` },
  ];

  const handleToggle = (idx, checked) => {
    const paid = { ...(state.compliancePaid || {}) };
    paid[`q-paid-${year}-${idx}`] = checked;
    updateState({ compliancePaid: paid });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {quarters.map((q, i) => {
        const due = new Date(q.isoDate);
        const isPast = due < now;
        const isSoon = !isPast && (due - now) < 30 * 24 * 3600 * 1000;
        const paid = (state.compliancePaid || {})[`q-paid-${year}-${i}`];

        let statusColor = 'border-[#E8E4E1]';
        let StatusIcon = paid ? CheckCircle2 : Circle;
        let iconColor = paid ? 'text-[#5F6F65]' : 'text-[#C8C0B8]';
        let badge = null;

        if (!paid && isPast) {
          statusColor = 'border-rose-300 bg-rose-50/60';
          StatusIcon = AlertTriangle;
          iconColor = 'text-rose-500';
          badge = <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 px-2 py-0.5 bg-rose-100 rounded-full">Overdue</span>;
        } else if (!paid && isSoon) {
          statusColor = 'border-amber-300 bg-amber-50/60';
          StatusIcon = Clock;
          iconColor = 'text-amber-500';
          badge = <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 px-2 py-0.5 bg-amber-100 rounded-full">Due Soon</span>;
        } else if (paid) {
          statusColor = 'border-emerald-200 bg-emerald-50/40';
        }

        return (
          <div key={i} className={`rounded-2xl border-2 p-6 flex flex-col gap-4 transition-all ${statusColor} bg-white`}>
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#8A7A6A]">{q.q}</span>
              {badge}
            </div>
            <div>
              <p className="text-3xl font-black text-[#2C2511]">${qPay.toLocaleString()}</p>
              <p className="text-[10px] text-[#9C8A7A] mt-1">per quarter</p>
            </div>
            <div className="text-[10px] text-[#9C8A7A] space-y-0.5">
              <p><span className="font-bold text-[#5F6F65]">Federal:</span> {q.fed}</p>
              <p><span className="font-bold text-[#4A6657]">AZ:</span> {q.az}</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mt-auto pt-3 border-t border-[#E8E4E1] group">
              <div className={`transition-transform group-hover:scale-110 ${iconColor}`}>
                <StatusIcon size={20} strokeWidth={2} />
              </div>
              <span className="text-sm font-bold text-[#5F6F65]">{paid ? 'Paid ✓' : 'Mark as Paid'}</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={!!paid}
                onChange={(e) => handleToggle(i, e.target.checked)}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
};

export default QuarterlyTracker;
