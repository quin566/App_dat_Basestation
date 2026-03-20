import { useAppState } from '../../contexts/StateContext';

const CheckmarkSVG = () => (
  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QuarterlyTracker = ({ annualTax }) => {
  const { state, updateState } = useAppState();

  const qPay = Math.round(
    (Number.isFinite(Number(annualTax)) ? Number(annualTax) : 0) / 4
  );

  const now = new Date();
  const year = now.getFullYear();

  const quarters = [
    { label: `Q1 ${year}`,       deadline: `April 15, ${year}`,       isoDate: `${year}-04-15` },
    { label: `Q2 ${year}`,       deadline: `June 16, ${year}`,        isoDate: `${year}-06-16` },
    { label: `Q3 ${year}`,       deadline: `Sept 15, ${year}`,        isoDate: `${year}-09-15` },
    { label: `Q4 ${year}`,       deadline: `Jan 15, ${year + 1}`,     isoDate: `${year + 1}-01-15` },
  ];

  const handleToggle = (idx) => {
    const paid = state.compliancePaid || {};
    const key = `q-paid-${year}-${idx}`;
    const next = { ...paid, [key]: !paid[key] };
    updateState({ compliancePaid: next });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {quarters.map((q, idx) => {
        const key = `q-paid-${year}-${idx}`;
        const paid = !!(state.compliancePaid || {})[key];

        const due = new Date(q.isoDate);
        const isPast = due < now;
        const isSoon = !isPast && (due - now) < 30 * 24 * 3600 * 1000;

        // Determine status
        let status = 'upcoming';
        if (paid) {
          status = 'paid';
        } else if (isPast) {
          status = 'overdue';
        } else if (isSoon) {
          status = 'due-soon';
        }

        // Card styling
        const cardStyles = {
          paid:     'border-emerald-200 bg-emerald-50/40',
          overdue:  'border-rose-300 bg-rose-50/60',
          'due-soon': 'border-amber-300 bg-amber-50/60',
          upcoming: 'border-[#E8E4E1] bg-white',
        }[status];

        // Badge
        const badge = {
          paid:       <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded-full">Paid</span>,
          overdue:    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 px-2 py-0.5 bg-rose-100 rounded-full">Overdue</span>,
          'due-soon': <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 px-2 py-0.5 bg-amber-100 rounded-full">Due Soon</span>,
          upcoming:   null,
        }[status];

        // Checkbox circle styling
        const circleStyles = paid
          ? 'bg-emerald-500 border-emerald-500'
          : status === 'overdue'
          ? 'bg-white border-rose-300'
          : status === 'due-soon'
          ? 'bg-white border-amber-400'
          : 'bg-white border-[#C8C0B8]';

        const actionLabel = paid ? 'Paid' : 'Mark as Paid';
        const actionLabelColor = paid ? 'text-emerald-700' : 'text-[#5F6F65]';

        return (
          <div
            key={idx}
            onClick={() => handleToggle(idx)}
            className={`rounded-2xl border-2 p-6 flex flex-col gap-4 transition-all cursor-pointer select-none ${cardStyles}`}
          >
            {/* Quarter label + badge */}
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#8A7A6A]">
                {q.label}
              </span>
              {badge}
            </div>

            {/* Amount */}
            <div>
              <p className="text-3xl font-black text-[#2C2511]">
                ${qPay.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#9C8A7A] mt-1">per quarter</p>
            </div>

            {/* Deadline */}
            <div className="text-[10px] text-[#9C8A7A] space-y-0.5">
              <p>
                <span className="font-bold text-[#5F6F65]">Due:</span>{' '}
                {q.deadline}
              </p>
            </div>

            {/* Custom checkbox row */}
            <div className="flex items-center gap-3 mt-auto pt-3 border-t border-[#E8E4E1]">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${circleStyles}`}
              >
                {paid && <CheckmarkSVG />}
              </div>
              <span className={`text-sm font-bold ${actionLabelColor}`}>
                {actionLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuarterlyTracker;
