import React, { useMemo } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { calculateTaxes, formatCurrency } from '../../utils/taxEngine';
import MetricCard from './MetricCard';
import {
  LayoutDashboard, Calculator, Zap, ShieldCheck, Users, CalendarDays,
  Clock, ArrowRight, TrendingUp, FileText, Camera, CheckCircle2,
  AlertTriangle, Info, Sparkles, Image,
} from 'lucide-react';

// ─── Revenue Bar Chart ─────────────────────────────────────────────────────────
const RevenueChart = ({ gross, expenses, tax, target }) => {
  const max = Math.max(gross, expenses + tax, target, 1);
  const bars = [
    { label: 'Gross Revenue',      value: gross,    color: '#5F6F65' },
    { label: 'Business Expenses',  value: expenses, color: '#D4A373' },
    { label: 'Est. Tax Owed',      value: tax,      color: '#C4847A' },
  ];
  const barWidth = 60;
  const chartH   = 150;
  const gap       = 48;
  const svgW      = bars.length * (barWidth + gap) - gap;

  // Target line y-position
  const targetY = target > 0 ? Math.round(chartH - (target / max) * chartH) : null;

  return (
    <div className="mt-6">
      <svg width="100%" viewBox={`0 -40 ${svgW} ${chartH + 80}`} className="overflow-visible">
        {/* Target dashed line */}
        {targetY !== null && (
          <g>
            <line x1={0} y1={targetY} x2={svgW} y2={targetY}
              stroke="#5F6F65" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.4" />
            <text x={svgW - 5} y={targetY - 5} fontSize="9" fill="#5F6F65" fontWeight="800" opacity="0.6" textAnchor="end">
              TARGET
            </text>
          </g>
        )}
        {bars.map((bar, i) => {
          const h = Math.round((bar.value / max) * chartH);
          const x = i * (barWidth + gap);
          const y = chartH - h;
          return (
            <g key={bar.label}>
              <rect x={x} y={0} width={barWidth} height={chartH} rx={12} fill="#F2EFE9" />
              <rect x={x} y={y} width={barWidth} height={h} rx={12} fill={bar.color} opacity={0.9} />
              {bar.value > 0 && (
                <text x={x + barWidth / 2} y={y - 12} textAnchor="middle" fontSize="12" fontWeight="800" fill={bar.color}>
                  {bar.value >= 1000 ? `$${Math.round(bar.value / 1000)}k` : `$${Math.round(bar.value)}`}
                </text>
              )}
              <text x={x + barWidth / 2} y={chartH + 24} textAnchor="middle" fontSize="11" fontWeight="700" fill="#9C8A7A">
                {bar.label.split(' ').map((word, wi) => (
                  <tspan key={wi} x={x + barWidth / 2} dy={wi === 0 ? 0 : 14}>{word}</tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-6 mt-8 flex-wrap">
        {bars.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A]">{b.label}</span>
          </div>
        ))}
        {target > 0 && (
          <div className="flex items-center gap-2">
            <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#5F6F65" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#5F6F65] opacity-60">Revenue Target</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Quarterly Payment Progress ────────────────────────────────────────────────
const QuarterlyProgress = ({ compliancePaid, setActiveTab }) => {
  const year  = new Date().getFullYear();
  const count = [0, 1, 2, 3].filter(i => !!(compliancePaid || {})[`q-paid-${year}-${i}`]).length;
  const labels = ['Q1', 'Q2', 'Q3', 'Q4'];

  return (
    <div
      onClick={() => setActiveTab('taxes')}
      className="mt-6 pt-6 border-t border-[#E8E4E1] cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A]">
          {year} Quarterly Payments
        </p>
        <span className="text-[10px] font-black text-[#5F6F65] group-hover:underline">
          {count}/4 paid →
        </span>
      </div>
      <div className="flex gap-2">
        {labels.map((label, i) => {
          const paid = !!(compliancePaid || {})[`q-paid-${year}-${i}`];
          return (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1.5 transition-all ${paid ? 'bg-[#5F6F65]' : 'bg-[#E8E4E1]'}`} />
              <span className={`text-[9px] font-black ${paid ? 'text-[#5F6F65]' : 'text-[#C8C0B8]'}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Smart Reminders ───────────────────────────────────────────────────────────
const URGENCY = {
  critical: { dot: 'bg-rose-500',    card: 'bg-rose-50 border-rose-200',       text: 'text-rose-700',    icon: 'text-rose-500'    },
  warning:  { dot: 'bg-amber-400',   card: 'bg-amber-50 border-amber-200',      text: 'text-amber-800',   icon: 'text-amber-500'   },
  info:     { dot: 'bg-[#5F6F65]',   card: 'bg-[#F2EFE9] border-[#E0DBD5]',    text: 'text-[#2C2511]',   icon: 'text-[#5F6F65]'   },
  success:  { dot: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-200',  text: 'text-emerald-800', icon: 'text-emerald-600' },
};

const buildReminders = (state, finances) => {
  const items = [];
  const now   = new Date();
  const year  = now.getFullYear();
  const paid  = state.compliancePaid || {};

  // 1. Quarterly estimated tax deadlines
  const quarters = [
    { label: 'Q1 Est. Tax',  iso: `${year}-04-15`,     idx: 0 },
    { label: 'Q2 Est. Tax',  iso: `${year}-06-16`,     idx: 1 },
    { label: 'Q3 Est. Tax',  iso: `${year}-09-15`,     idx: 2 },
    { label: 'Q4 Est. Tax',  iso: `${year + 1}-01-15`, idx: 3 },
  ];
  const nextQ = quarters.find(q => new Date(q.iso) >= now);
  if (nextQ) {
    const isPaid   = !!paid[`q-paid-${year}-${nextQ.idx}`];
    const daysAway = Math.ceil((new Date(nextQ.iso) - now) / 86400000);
    const dueStr   = new Date(nextQ.iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (isPaid) {
      items.push({ urgency: 'success', icon: CheckCircle2,  title: `${nextQ.label} — Paid ✓`,        desc: `Due ${dueStr} — you're all set`, tab: 'taxes' });
    } else {
      items.push({
        urgency: daysAway <= 7 ? 'critical' : daysAway <= 30 ? 'warning' : 'info',
        icon: Clock,
        title: `${nextQ.label} due ${dueStr}`,
        desc: `${daysAway} day${daysAway === 1 ? '' : 's'} away · ${formatCurrency(Math.round((finances.totalTax || 0) / 4))} est.`,
        tab: 'taxes',
      });
    }
  }

  // 2. AZ Transaction Privilege Tax (TPT) — due 20th of following month
  const tptDue = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 20 ? 2 : 1), 20);
  const daysToTPT = Math.ceil((tptDue - now) / 86400000);
  const tptFor = new Date(tptDue.getFullYear(), tptDue.getMonth() - 1, 1)
    .toLocaleDateString('en-US', { month: 'long' });
  items.push({
    urgency: daysToTPT <= 5 ? 'critical' : daysToTPT <= 14 ? 'warning' : 'info',
    icon: FileText,
    title: `AZ TPT Filing — ${tptFor}`,
    desc: `Due ${tptDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${daysToTPT} days`,
    tab: 'compliance',
  });

  // 3. Stale leads > 48 h
  const leads       = state.crmLeads || [];
  const staleLeads  = leads.filter(l => l.logDate && (Date.now() - l.logDate) / 3600000 > 48);
  if (staleLeads.length > 0) {
    items.push({
      urgency: 'critical',
      icon: Users,
      title: `${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} need follow-up`,
      desc: '48-hour response window closing — reply now',
      tab: 'crm',
    });
  } else if (leads.length > 0) {
    items.push({ urgency: 'success', icon: Users, title: `${leads.length} active lead${leads.length > 1 ? 's' : ''}`, desc: 'All within 48-hour window — great!', tab: 'crm' });
  }

  // 4. Upcoming shoots
  const clients  = state.bookedClients || [];
  const upcoming = clients
    .filter(c => c.shootDate && new Date(c.shootDate) >= now)
    .sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate));
  if (upcoming.length > 0) {
    const next      = upcoming[0];
    const daysAway  = Math.ceil((new Date(next.shootDate) - now) / 86400000);
    const dayLabel  = daysAway === 0 ? 'Today!' : daysAway === 1 ? 'Tomorrow' : `${daysAway} days`;
    const dateStr   = new Date(next.shootDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    items.push({
      urgency: daysAway <= 1 ? 'warning' : 'info',
      icon: Camera,
      title: `Shoot: ${next.name}`,
      desc: `${dayLabel} · ${dateStr}${upcoming.length > 1 ? ` · +${upcoming.length - 1} more` : ''}`,
      tab: 'crm',
    });
  }

  // 5. Revenue goal
  const target = state.revenueTarget || 100000;
  const gross  = state.grossRevenue  || 0;
  const pct    = target > 0 ? Math.round((gross / target) * 100) : 0;
  if (pct >= 100) {
    items.push({ urgency: 'success', icon: TrendingUp, title: 'Annual revenue goal hit! 🎉', desc: `${formatCurrency(gross)} of ${formatCurrency(target)} target`, tab: 'taxes' });
  } else if (pct >= 75) {
    items.push({ urgency: 'info', icon: TrendingUp, title: `${pct}% to revenue goal`, desc: `${formatCurrency(target - gross)} remaining this year`, tab: 'taxes' });
  }

  // 6. AZ LLC reminder — no annual report needed in AZ, but biz license typically annual
  const janFirst = new Date(year, 0, 1);
  const daysFromJan = Math.floor((now - janFirst) / 86400000);
  if (daysFromJan <= 30) {
    items.push({
      urgency: 'warning',
      icon: ShieldCheck,
      title: 'Annual business review',
      desc: 'Confirm AZ registrations & insurance are current',
      tab: 'compliance',
    });
  }
  // 7. Gallery deliveries due soon / overdue
  const galleryItems = state.galleryDeliveries || [];
  const galSettings  = state.gallerySettings || { dueSoonDays: 5, urgentDays: 2 };
  const dueSoonThreshold = galSettings.dueSoonDays ?? 5;
  const urgentThreshold  = galSettings.urgentDays ?? 2;

  const galleryDue = galleryItems
    .filter(g => g.status !== 'delivered')
    .map(g => {
      const galDueDays   = g.dueDate ? Math.ceil((new Date(g.dueDate + 'T00:00:00') - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000) : Infinity;
      const sneakDueDays = (g.sneakPeekNeeded && !g.sneakPeekDelivered && g.sneakPeekDueDate)
        ? Math.ceil((new Date(g.sneakPeekDueDate + 'T00:00:00') - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
        : Infinity;
      return { ...g, mostUrgentDays: Math.min(galDueDays, sneakDueDays), isSneakPeek: sneakDueDays < galDueDays };
    })
    .filter(g => g.mostUrgentDays <= dueSoonThreshold)
    .sort((a, b) => a.mostUrgentDays - b.mostUrgentDays);

  galleryDue.forEach(g => {
    const daysLeft = g.mostUrgentDays;
    const what     = g.isSneakPeek ? 'Sneak peek' : 'Gallery';
    const dateStr  = g.isSneakPeek
      ? new Date(g.sneakPeekDueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : new Date(g.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const label    = daysLeft < 0 ? 'OVERDUE' : daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `${daysLeft} days`;

    items.push({
      urgency: daysLeft < 0 ? 'critical' : daysLeft <= urgentThreshold ? 'critical' : 'warning',
      icon: Image,
      title: `${what}: ${g.name}`,
      desc: `${label} · ${dateStr}`,
      tab: 'gallery',
    });
  });

  const order = { critical: 0, warning: 1, info: 2, success: 3 };
  return items.sort((a, b) => (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4));
};

const SmartReminders = ({ state, finances, setActiveTab }) => {
  const reminders = useMemo(() => buildReminders(state, finances), [state, finances]);

  return (
    <div className="space-y-2.5">
      {reminders.map((r, i) => {
        const s = URGENCY[r.urgency];
        return (
          <div
            key={i}
            onClick={r.tab ? () => setActiveTab(r.tab) : undefined}
            className={`flex items-start gap-3 p-3.5 rounded-xl border ${s.card} ${r.tab ? 'cursor-pointer hover:opacity-80 active:scale-[0.99] transition-all' : ''}`}
          >
            <div className={`mt-0.5 shrink-0 ${s.icon}`}>
              <r.icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black leading-tight ${s.text}`}>{r.title}</p>
              <p className={`text-[10px] font-bold mt-0.5 leading-tight opacity-70 ${s.text}`}>{r.desc}</p>
            </div>
            {r.tab && <ArrowRight size={11} className={`shrink-0 mt-0.5 opacity-30 ${s.text}`} />}
          </div>
        );
      })}
    </div>
  );
};

// ─── Live Activity Feed ────────────────────────────────────────────────────────
const ActivityFeed = ({ leads, clients, setActiveTab }) => {
  const now   = new Date();
  const items = [];

  const upcoming = [...clients]
    .filter(c => new Date(c.shootDate) >= now)
    .sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate));

  if (upcoming.length > 0) {
    const next     = upcoming[0];
    const daysAway = Math.ceil((new Date(next.shootDate) - now) / 86400000);
    items.push({
      icon: CalendarDays,
      text: `${next.name}`,
      meta: `Shoot in ${daysAway} day${daysAway === 1 ? '' : 's'} · ${next.shootDate}`,
      accent: daysAway <= 7 ? 'text-amber-500' : 'text-[#5F6F65]',
      tab: 'crm',
    });
  }

  if (leads.length > 0) {
    const urgent = leads.filter(l => (Date.now() - l.logDate) / 3600000 > 36);
    items.push({
      icon: Users,
      text: `${leads.length} active inquiry${leads.length === 1 ? '' : 'ies'}`,
      meta: urgent.length > 0 ? `${urgent.length} need urgent reply` : 'All within window',
      accent: urgent.length > 0 ? 'text-rose-500' : 'text-[#9C8A7A]',
      tab: 'crm',
    });
  }

  const year = now.getFullYear();
  const qDeadlines = [
    { label: 'Q1 Tax', iso: `${year}-04-15` },
    { label: 'Q2 Tax', iso: `${year}-06-16` },
    { label: 'Q3 Tax', iso: `${year}-09-15` },
    { label: 'Q4 Tax', iso: `${year + 1}-01-15` },
  ];
  const nextQ = qDeadlines.find(q => new Date(q.iso) > now);
  if (nextQ) {
    const d = Math.ceil((new Date(nextQ.iso) - now) / 86400000);
    items.push({
      icon: Clock,
      text: nextQ.label,
      meta: `Due in ${d} day${d === 1 ? '' : 's'}`,
      accent: d <= 14 ? 'text-amber-500' : 'text-[#9C8A7A]',
      tab: 'taxes',
    });
  }

  if (items.length === 0) {
    items.push({ icon: Sparkles, text: 'All clear!', meta: 'Add clients & leads to see live activity', accent: 'text-[#9C8A7A]' });
  }

  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li
          key={i}
          onClick={item.tab ? () => setActiveTab(item.tab) : undefined}
          className={`flex items-start gap-3 pb-4 border-b border-[#F5F2ED] last:border-0 last:pb-0 rounded-lg transition-colors ${item.tab ? 'cursor-pointer hover:bg-[#FDFCFB] -mx-2 px-2' : ''}`}
        >
          <div className={`mt-0.5 shrink-0 ${item.accent}`}>
            <item.icon size={14} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#332F2E]">{item.text}</p>
            <p className={`text-[10px] font-bold uppercase tracking-tight mt-0.5 ${item.accent}`}>{item.meta}</p>
          </div>
          {item.tab && <ArrowRight size={12} className="mt-0.5 text-[#C8BFB5]" />}
        </li>
      ))}
    </ul>
  );
};

// ─── Smart greeting ────────────────────────────────────────────────────────────
const getGreeting = name => {
  const h = new Date().getHours();
  const sal = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${sal}, ${name} ✦`;
};

const formatDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

// ─── Business Health badge ─────────────────────────────────────────────────────
const getHealthStatus = (state, finances) => {
  const leads     = state.crmLeads      || [];
  const stale     = leads.filter(l => l.logDate && (Date.now() - l.logDate) / 3600000 > 48);
  const year      = new Date().getFullYear();
  const paid      = state.compliancePaid || {};
  const now       = new Date();
  const pastQs    = [
    { iso: `${year}-04-15`, idx: 0 },
    { iso: `${year}-06-16`, idx: 1 },
    { iso: `${year}-09-15`, idx: 2 },
  ].filter(q => new Date(q.iso) < now);
  const unpaidPast = pastQs.filter(q => !paid[`q-paid-${year}-${q.idx}`]);

  if (unpaidPast.length > 0 || stale.length > 0) {
    return { label: 'Needs Attention', color: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  }
  if (stale.length === 0 && leads.length > 0) {
    return { label: 'On Track', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  }
  return { label: 'Looking Good', color: 'bg-[#F2EFE9] text-[#5F6F65] border-[#E0DBD5]', dot: 'bg-[#5F6F65]' };
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const DashboardView = () => {
  const { state, setActiveTab } = useAppState();

  const name          = state.businessProfile?.name || 'Ariana';
  const leads         = state.crmLeads      || [];
  const clients       = state.bookedClients || [];
  const revenueTarget = state.revenueTarget ?? 100000;

  const finances = useMemo(() =>
    calculateTaxes(state.grossRevenue || 0, state.bizExpenses || 0),
    [state.grossRevenue, state.bizExpenses]
  );

  const { totalPaid, remainingTax } = useMemo(() => {
    const year  = new Date().getFullYear();
    const tax   = Number.isFinite(finances.totalTax) ? finances.totalTax : 0;
    const qPay  = Math.round(tax / 4);
    const count = [0, 1, 2, 3].filter(i => !!(state.compliancePaid || {})[`q-paid-${year}-${i}`]).length;
    return { totalPaid: count * qPay, remainingTax: Math.max(0, tax - count * qPay) };
  }, [finances.totalTax, state.compliancePaid]);

  const health = useMemo(() => getHealthStatus(state, finances), [state, finances]);

  const revenueProgress = {
    current: state.grossRevenue || 0,
    max: revenueTarget,
    label: `${Math.round(((state.grossRevenue || 0) / revenueTarget) * 100)}% of ${formatCurrency(revenueTarget)} annual target`,
  };

  const taxProgress = {
    current: totalPaid,
    max: finances.totalTax || 1,
    label: `${formatCurrency(totalPaid)} of ${formatCurrency(finances.totalTax)} paid`,
    color: '#D4A373',
  };

  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header data-tour="dashboard-overview" className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 text-[#9C8A7A] text-xs font-bold uppercase tracking-widest">
            <LayoutDashboard size={13} />
            <span>Command Center</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#9C8A7A] font-bold">{formatDate()}</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${health.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
              {health.label}
            </div>
          </div>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">{getGreeting(name)}</h2>
        <p className="text-[#8A7A6A] mt-2 text-base">
          {clients.length > 0 || leads.length > 0
            ? [
                clients.length > 0 && `${clients.length} client${clients.length > 1 ? 's' : ''} booked`,
                leads.length   > 0 && `${leads.length} active lead${leads.length > 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · ')
            : 'Your Arizona photography business summary.'}
        </p>
      </header>

      {/* ── Metric Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Net Profit"
          value={finances.netProfit}
          icon={Zap}
          accent="sage"
          trend={{ value: `${Math.round(((state.grossRevenue || 0) / revenueTarget) * 100)}% to goal`, positive: true }}
          progress={revenueProgress}
          onClick={() => setActiveTab('taxes')}
        />
        <MetricCard
          title="Est. Tax Remaining"
          value={remainingTax}
          subtext={`Total owed: ${formatCurrency(finances.totalTax)}`}
          icon={Calculator}
          accent="amber"
          progress={{ ...taxProgress, color: '#D4A373' }}
          onClick={() => setActiveTab('taxes')}
        />
        <MetricCard
          title="Take-Home Pay"
          value={finances.takehome}
          subtext="After all taxes and expenses."
          icon={ShieldCheck}
          accent="charcoal"
          onClick={() => setActiveTab('taxes')}
        />
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Snapshot */}
        <div
          onClick={() => setActiveTab('taxes')}
          className="lg:col-span-2 bg-[#F2EFE9] rounded-3xl p-8 border border-[#E8E4E1] cursor-pointer hover:shadow-md hover:scale-[1.005] active:scale-[1.00] transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 bg-[#5F6F65] rounded-full" />
                <h3 className="text-lg font-black text-[#2C2511]">Revenue Snapshot</h3>
              </div>
              <p className="text-xs text-[#9C8A7A] ml-3.5">
                {formatCurrency(state.grossRevenue || 0)} gross · {formatCurrency(revenueTarget)} target · Update in Tax Planner
              </p>
            </div>
            <ArrowRight size={16} className="text-[#C8BFB5] shrink-0 mt-1" />
          </div>

          <RevenueChart
            gross={state.grossRevenue || 0}
            expenses={state.bizExpenses || 0}
            tax={finances.totalTax}
            target={revenueTarget}
          />

          <QuarterlyProgress compliancePaid={state.compliancePaid} setActiveTab={setActiveTab} />
        </div>

        {/* Right column — Reminders + Activity */}
        <div className="space-y-6">

          {/* Smart Reminders */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E4E1] shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-5 bg-rose-400 rounded-full" />
              <h3 className="text-base font-black text-[#2C2511]">Reminders</h3>
              <Info size={12} className="text-[#C8BFB5] ml-auto" />
            </div>
            <SmartReminders state={state} finances={finances} setActiveTab={setActiveTab} />
          </div>

          {/* Live Activity */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E4E1] shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-5 bg-[#5F6F65] rounded-full" />
              <h3 className="text-base font-black text-[#2C2511]">Live Activity</h3>
            </div>
            <ActivityFeed leads={leads} clients={clients} setActiveTab={setActiveTab} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardView;
