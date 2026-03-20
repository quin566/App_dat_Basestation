import React, { useMemo } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { calculateTaxes, formatCurrency } from '../../utils/taxEngine';
import MetricCard from './MetricCard';
import { LayoutDashboard, Calculator, Zap, ShieldCheck, Users, CalendarDays, Clock } from 'lucide-react';

// --- Pure SVG Revenue Bar Chart ---
const RevenueChart = ({ gross, expenses, tax }) => {
  const max = Math.max(gross, expenses + tax, 1);
  const bars = [
    { label: 'Gross Revenue', value: gross, color: '#5F6F65', textColor: 'text-[#5F6F65]' },
    { label: 'Business Expenses', value: expenses, color: '#D4A373', textColor: 'text-[#D4A373]' },
    { label: 'Est. Tax Owed', value: tax, color: '#C4847A', textColor: 'text-[#C4847A]' },
  ];
  const barWidth = 56;
  const chartH = 160;
  const gap = 40;
  const svgW = bars.length * (barWidth + gap);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${svgW} ${chartH + 48}`} className="overflow-visible">
        {bars.map((bar, i) => {
          const h = Math.round((bar.value / max) * chartH);
          const x = i * (barWidth + gap);
          const y = chartH - h;
          return (
            <g key={bar.label}>
              {/* Background track */}
              <rect x={x} y={0} width={barWidth} height={chartH} rx={10} fill="#F2EFE9" />
              {/* Value bar */}
              <rect x={x} y={y} width={barWidth} height={h} rx={10} fill={bar.color} opacity={0.9} />
              {/* Value label */}
              {bar.value > 0 && (
                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill={bar.color}>
                  {bar.value >= 1000 ? `$${Math.round(bar.value / 1000)}k` : `$${Math.round(bar.value)}`}
                </text>
              )}
              {/* Axis label */}
              <text x={x + barWidth / 2} y={chartH + 20} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#9C8A7A">
                {bar.label.split(' ').map((word, wi) => (
                  <tspan key={wi} x={x + barWidth / 2} dy={wi === 0 ? 0 : 12}>{word}</tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend dots */}
      <div className="flex items-center gap-5 mt-4">
        {bars.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
            <span className="text-[10px] font-bold text-[#9C8A7A]">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Live Activity Feed ---
const ActivityFeed = ({ leads, clients }) => {
  const now = new Date();
  const items = [];

  // Next upcoming shoot
  const upcomingClients = [...clients]
    .filter(c => new Date(c.shootDate) >= now)
    .sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate));

  if (upcomingClients.length > 0) {
    const next = upcomingClients[0];
    const daysAway = Math.ceil((new Date(next.shootDate) - now) / (1000 * 60 * 60 * 24));
    items.push({
      icon: CalendarDays,
      text: `Next shoot: ${next.name}`,
      meta: `${daysAway} day${daysAway === 1 ? '' : 's'} away · ${next.shootDate}`,
      accent: daysAway <= 7 ? 'text-amber-600' : 'text-[#5F6F65]',
    });
  }

  // Active leads
  if (leads.length > 0) {
    const urgent = leads.filter(l => (Date.now() - l.logDate) / 3600000 > 36);
    items.push({
      icon: Users,
      text: `${leads.length} active inquiry${leads.length === 1 ? '' : 'ies'}`,
      meta: urgent.length > 0 ? `${urgent.length} response window closing soon!` : 'All within 48-hour window',
      accent: urgent.length > 0 ? 'text-rose-600' : 'text-[#9C8A7A]',
    });
  }

  // Next quarterly tax
  const year = now.getFullYear();
  const quarters = [
    { label: 'Q1 est. tax', iso: `${year}-04-15` },
    { label: 'Q2 est. tax', iso: `${year}-06-16` },
    { label: 'Q3 est. tax', iso: `${year}-09-15` },
    { label: 'Q4 est. tax', iso: `${year + 1}-01-15` },
  ];
  const nextQ = quarters.find(q => new Date(q.iso) > now);
  if (nextQ) {
    const daysToQ = Math.ceil((new Date(nextQ.iso) - now) / (1000 * 60 * 60 * 24));
    items.push({
      icon: Clock,
      text: `${nextQ.label} due ${nextQ.iso}`,
      meta: `${daysToQ} days away`,
      accent: daysToQ <= 14 ? 'text-amber-600' : 'text-[#9C8A7A]',
    });
  }

  if (items.length === 0) {
    items.push({
      icon: Zap,
      text: 'All clear for now!',
      meta: 'Add clients and leads to see live activity.',
      accent: 'text-[#9C8A7A]',
    });
  }

  return (
    <ul className="space-y-5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-4 border-b border-[#FAF8F3] pb-5 last:border-0 last:pb-0">
          <div className={`mt-0.5 flex-shrink-0 ${item.accent}`}>
            <item.icon size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#332F2E]">{item.text}</p>
            <p className={`text-[10px] font-bold uppercase tracking-tight mt-0.5 ${item.accent}`}>{item.meta}</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

// --- Smart Greeting ---
const getGreeting = (name) => {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  return `${salutation}, ${name}`;
};

// --- Main Dashboard View ---
const DashboardView = () => {
  const { state } = useAppState();
  const name = state.businessProfile?.name || 'Ariana';
  const leads = state.crmLeads || [];
  const clients = state.bookedClients || [];

  const finances = useMemo(() => calculateTaxes(
    state.grossRevenue || 0,
    state.bizExpenses || 0
  ), [state.grossRevenue, state.bizExpenses]);

  const subtitle = useMemo(() => {
    const parts = [];
    if (clients.length > 0) parts.push(`${clients.length} client${clients.length > 1 ? 's' : ''} booked`);
    if (leads.length > 0) parts.push(`${leads.length} active lead${leads.length > 1 ? 's' : ''}`);
    if (parts.length === 0) return 'Your Arizona business summary.';
    return parts.join(' · ') + '.';
  }, [clients.length, leads.length]);

  return (
    <div className="p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <LayoutDashboard size={14} />
          <span>Dashboard Hub</span>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">{getGreeting(name)}</h2>
        <p className="text-[#8A7A6A] mt-2 text-lg">{subtitle}</p>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <MetricCard
          title="Net Profit"
          value={finances.netProfit}
          subtext="Revenue after expenses, before taxes."
          icon={Zap}
          accent="sage"
          trend={{ value: 'Target: $100k', positive: true }}
        />
        <MetricCard
          title="Estimated Tax"
          value={finances.totalTax}
          subtext={`Federal (${Math.round(finances.marginalRate * 100)}% bracket) + SE + AZ 2.5%.`}
          icon={Calculator}
          accent="amber"
        />
        <MetricCard
          title="Take-Home Pay"
          value={finances.takehome}
          subtext="Your net income after all tax obligations."
          icon={ShieldCheck}
          accent="charcoal"
        />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#F2EFE9] rounded-3xl p-8 border border-[#E8E4E1]">
          <h3 className="text-xl font-black mb-2 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#5F6F65] rounded-full" />
            Revenue Snapshot
          </h3>
          <p className="text-xs text-[#9C8A7A] mb-6">
            Based on {formatCurrency(state.grossRevenue || 0)} gross · Update figures in Tax Planner
          </p>
          <RevenueChart
            gross={state.grossRevenue || 0}
            expenses={state.bizExpenses || 0}
            tax={finances.totalTax}
          />
        </div>

        <div className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm">
          <h3 className="text-xl font-black mb-6">Live Activity</h3>
          <ActivityFeed leads={leads} clients={clients} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
