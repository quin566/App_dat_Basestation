import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Link, RefreshCw, DollarSign, TrendingUp, TrendingDown, Minus,
  BarChart2, Tag, AlertCircle, CheckCircle2, Wallet, Plus, X,
  ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';
import MetricCard from '../Dashboard/MetricCard';
import { categorize, CATEGORIES } from '../../utils/categorizer';
import {
  buildPL, predictRevenue, deriveTaxLiability,
  getTopExpenseCategories, getMonthOverMonthChange, centsToDisplay,
} from '../../utils/financialEngine';

// ─── Palette ─────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#5F6F65', '#D4A373', '#7A8C82', '#C4847A', '#9FAB6D', '#B5956A'];
const PIE_COLORS   = CHART_COLORS;

const formatMonth = (m) => {
  if (!m) return '';
  const [yr, mo] = m.split('-');
  return new Date(Number(yr), Number(mo) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#2C2511] text-[#FAF8F3] rounded-xl px-3 py-2 text-xs font-bold shadow-xl">
      <div className="mb-1 opacity-70">{formatMonth(label) || label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }} className="flex gap-2">
          <span>{p.name}:</span>
          <span>{centsToDisplay(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Manual Transaction Modal ─────────────────────────────────────────────────
const ManualTxnModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amountStr: '',
    type: 'expense',
    category: 'Other',
  });

  const handleSave = () => {
    const raw = parseFloat(form.amountStr.replace(/[^0-9.]/g, ''));
    if (!raw || !form.description.trim()) return;
    const cents = Math.round(raw * 100) * (form.type === 'income' ? 1 : -1);
    onSave({
      id: `manual_${Date.now()}`,
      accountId: 'manual',
      date: form.date,
      description: form.description.trim(),
      amount: cents,
      category: form.type === 'income' ? 'Income' : form.category,
      categoryOverride: true,
      source: 'manual',
    });
  };

  const inputCls = 'w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30';
  const labelCls = 'text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-2';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[#E8E4E1]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-[#2C2511]">Add Manual Transaction</h3>
          <button onClick={onClose} className="text-[#9C8A7A] hover:text-[#2C2511]"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Client payment — Jones Wedding" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount ($)</label>
              <input value={form.amountStr} onChange={e => setForm(f => ({ ...f, amountStr: e.target.value }))} placeholder="0.00" className={inputCls} />
            </div>
          </div>
          {form.type === 'expense' && (
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                {CATEGORIES.filter(c => c !== 'Income').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-black text-sm border border-[#E8E4E1] text-[#8A7A6A] hover:bg-[#F2EFE9]">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl font-black text-sm bg-[#5F6F65] text-white hover:bg-[#4A6657]">Add Transaction</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BusinessHealthView = () => {
  const { state, updateState } = useAppState();

  const [section, setSection] = useState('overview');
  const [horizon, setHorizon] = useState(6);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [txnFilter, setTxnFilter] = useState({ category: 'all', search: '' });
  const [txnPage, setTxnPage] = useState(0);

  const transactions = useMemo(() => state.transactions || [], [state.transactions]);
  const bankAccounts = useMemo(() => state.bankAccounts || [], [state.bankAccounts]);

  const pl         = useMemo(() => buildPL(transactions), [transactions]);
  const taxSnap    = useMemo(() => deriveTaxLiability(transactions), [transactions]);
  const topExp     = useMemo(() => getTopExpenseCategories(transactions, 6), [transactions]);
  const predictions = useMemo(() => predictRevenue(transactions, horizon), [transactions, horizon]);
  const mom        = useMemo(() => getMonthOverMonthChange(pl.months), [pl.months]);

  // ── Auto-sync on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (bankAccounts.length === 0) return;
    const run = async () => {
      for (const acct of bankAccounts) {
        try {
          const res = await window.electronAPI?.stripeSyncTransactions?.({ accountId: acct.id });
          if (res?.success) mergeTransactions(res.transactions);
        } catch (e) { /* silent — offline ok */ }
      }
    };
    run();
    const interval = setInterval(run, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stripe OAuth return listener ─────────────────────────────────────────
  useEffect(() => {
    window.electronAPI?.onStripeAuthComplete?.(async ({ sessionId }) => {
      if (!sessionId) return;
      const res = await window.electronAPI.stripeGetAccounts({ sessionId });
      if (res?.success && res.accounts.length > 0) {
        const existing = state.bankAccounts || [];
        const newAccts = res.accounts.filter(a => !existing.find(e => e.id === a.id));
        if (newAccts.length > 0) {
          updateState({ bankAccounts: [...existing, ...newAccts] });
          // Immediately sync transactions for each new account
          for (const acct of newAccts) {
            const txRes = await window.electronAPI?.stripeSyncTransactions?.({ accountId: acct.id });
            if (txRes?.success) mergeTransactions(txRes.transactions);
          }
        }
      }
      setPendingSessionId(null);
      setIsLinking(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mergeTransactions = useCallback((incoming = []) => {
    updateState(prev => {
      const existing = prev.transactions || [];
      const existingIds = new Set(existing.map(t => t.id));
      const newTxns = incoming
        .filter(t => !existingIds.has(t.id))
        .map(t => ({ ...t, category: categorize(t), categoryOverride: false }));
      if (newTxns.length === 0) return prev;
      return { ...prev, transactions: [...existing, ...newTxns] };
    });
  }, [updateState]);

  const handleLinkAccount = async () => {
    if (!window.electronAPI?.stripeCreateLinkSession) {
      setSyncError('Stripe not available. Make sure you are running the desktop app.');
      return;
    }
    setIsLinking(true);
    setSyncError(null);
    const res = await window.electronAPI.stripeCreateLinkSession();
    if (!res?.success) {
      setSyncError(res?.error || 'Failed to start Stripe link session.');
      setIsLinking(false);
      return;
    }
    setPendingSessionId(res.sessionId);
    // Open Stripe hosted link flow in default browser
    await window.electronAPI.openExternal(
      `https://connect.stripe.com/setup/s/${res.clientSecret}`
    );
  };

  const handleSync = async (accountId) => {
    setIsSyncing(true);
    setSyncError(null);
    const res = await window.electronAPI?.stripeSyncTransactions?.({ accountId });
    if (res?.success) {
      mergeTransactions(res.transactions);
    } else {
      setSyncError(res?.error || 'Sync failed.');
    }
    setIsSyncing(false);
  };

  const handleAddManual = (txn) => {
    updateState(prev => ({
      ...prev,
      transactions: [txn, ...(prev.transactions || [])],
    }));
    setShowManual(false);
  };

  const handleCategoryOverride = (txnId, newCategory) => {
    updateState(prev => ({
      ...prev,
      transactions: (prev.transactions || []).map(t =>
        t.id === txnId ? { ...t, category: newCategory, categoryOverride: true } : t
      ),
    }));
  };

  // ── Filtered + paginated transactions ────────────────────────────────────
  const PAGE_SIZE = 50;
  const filteredTxns = useMemo(() => {
    const search = txnFilter.search.toLowerCase();
    return [...transactions]
      .filter(t => {
        const matchCat = txnFilter.category === 'all' || t.category === txnFilter.category;
        const matchSearch = !search || (t.description || '').toLowerCase().includes(search);
        return matchCat && matchSearch;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, txnFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTxns.length / PAGE_SIZE));
  const pageTxns   = filteredTxns.slice(txnPage * PAGE_SIZE, (txnPage + 1) * PAGE_SIZE);

  // ── Chart data ────────────────────────────────────────────────────────────
  const plChartData = pl.months.slice(-12).map(m => ({
    month: m.month,
    Income: m.grossIncome,
    Expenses: m.totalExpenses,
  }));

  const predChartData = useMemo(() => {
    const hist = (predictions.historical || []).map(h => ({
      month: h.month, actual: h.actual, predicted: null,
    }));
    const pred = (predictions.predicted || []).map(p => ({
      month: p.month, actual: null, predicted: p.predicted,
    }));
    return [...hist.slice(-6), ...pred];
  }, [predictions]);

  const pieData = topExp.map((e, i) => ({
    name: e.category,
    value: e.total,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  // ── Shared card class ─────────────────────────────────────────────────────
  const card = 'bg-white rounded-3xl border border-[#E8E4E1] shadow-sm';
  const glassCard = 'bg-white/70 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl';
  const sectionBtnCls = (id) =>
    `px-5 py-2.5 rounded-xl font-black text-sm transition-all ${
      section === id
        ? 'bg-[#5F6F65] text-white shadow-sm'
        : 'text-[#8A7A6A] hover:bg-[#F2EFE9]'
    }`;

  const TrendIcon = predictions.trend === 'up' ? TrendingUp
    : predictions.trend === 'down' ? TrendingDown
    : Minus;

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
            <BarChart2 size={14} /><span>Business Health</span>
          </div>
          <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">Financial Overview</h2>
          <p className="text-[#8A7A6A] mt-2 text-lg">P&amp;L, bank data, and revenue predictions in one place.</p>
        </div>
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm bg-[#5F6F65] text-white hover:bg-[#4A6657] transition-all active:scale-95"
        >
          <Plus size={16} /> Add Transaction
        </button>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-2">
        {[['overview', 'Overview'], ['transactions', 'Transactions'], ['predictions', 'Predictions']].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} className={sectionBtnCls(id)}>{label}</button>
        ))}
      </div>

      {syncError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 text-sm font-bold">
          <AlertCircle size={16} className="shrink-0" />
          {syncError}
          <button onClick={() => setSyncError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="YTD Revenue"
              value={pl.ytd.grossIncome / 100}
              icon={DollarSign}
              accent="sage"
              subtext={`${mom.incomeChange > 0 ? '+' : ''}${mom.incomeChange.toFixed(1)}% vs prior month`}
              trend={pl.ytd.grossIncome > 0 ? { value: centsToDisplay(pl.ytd.grossIncome), positive: true } : undefined}
            />
            <MetricCard
              title="YTD Expenses"
              value={pl.ytd.totalExpenses / 100}
              icon={Tag}
              accent="amber"
              subtext={`${mom.expenseChange > 0 ? '+' : ''}${mom.expenseChange.toFixed(1)}% vs prior month`}
            />
            <MetricCard
              title="YTD Net Profit"
              value={pl.ytd.netProfit / 100}
              icon={TrendingUp}
              accent={pl.ytd.netProfit >= 0 ? 'emerald' : 'amber'}
              subtext={`${mom.netChange > 0 ? '+' : ''}${mom.netChange.toFixed(1)}% vs prior month`}
            />
            <MetricCard
              title="Est. Tax Liability"
              value={taxSnap.totalTax || 0}
              icon={Wallet}
              accent="charcoal"
              subtext={`~${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxSnap.quarterlyEstimate || 0)} quarterly`}
            />
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* P&L Area Chart */}
            <div className={`${glassCard} p-6 lg:col-span-2`}>
              <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-5">Monthly P&amp;L</h3>
              {plChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={plChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5F6F65" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#5F6F65" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4A373" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D4A373" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11, fill: '#9C8A7A' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11, fill: '#9C8A7A' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Income" stroke="#5F6F65" strokeWidth={2.5} fill="url(#incomeGrad)" />
                    <Area type="monotone" dataKey="Expenses" stroke="#D4A373" strokeWidth={2.5} fill="url(#expGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No transaction data yet. Link a bank account or add a manual transaction." />
              )}
            </div>

            {/* Expense Pie */}
            <div className={`${card} p-6`}>
              <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-5">Expense Breakdown</h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => centsToDisplay(v)} contentStyle={{ background: '#2C2511', color: '#FAF8F3', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="font-bold text-[#8A7A6A]">{d.name}</span>
                        </div>
                        <span className="font-black text-[#2C2511]">{centsToDisplay(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart message="No expenses recorded yet." />
              )}
            </div>
          </div>

          {/* Bank Accounts */}
          <div className={`${card} p-6`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Linked Bank Accounts</h3>
              <button
                onClick={handleLinkAccount}
                disabled={isLinking}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs bg-[#5F6F65] text-white hover:bg-[#4A6657] disabled:opacity-60 transition-all"
              >
                {isLinking ? <RefreshCw size={13} className="animate-spin" /> : <Link size={13} />}
                {isLinking ? 'Linking…' : 'Link Account'}
              </button>
            </div>
            {bankAccounts.length === 0 ? (
              <div className="text-center py-10 text-[#9C8A7A] text-sm font-medium">
                <Wallet size={32} className="mx-auto mb-3 opacity-30" />
                No bank accounts linked. Click "Link Account" to connect via Stripe.
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((acct) => (
                  <div key={acct.id} className="flex items-center justify-between bg-[#F8F6F2] rounded-2xl px-5 py-4">
                    <div>
                      <div className="font-black text-[#2C2511] text-sm">{acct.institutionName}</div>
                      <div className="text-xs text-[#9C8A7A] font-medium">{acct.displayName} ••{acct.last4}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      {acct.balance !== null && (
                        <span className="font-black text-[#5F6F65] text-sm">
                          {centsToDisplay(acct.balance)}
                        </span>
                      )}
                      <button
                        onClick={() => handleSync(acct.id)}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs border border-[#E8E4E1] text-[#8A7A6A] hover:bg-white disabled:opacity-50 transition-all"
                      >
                        <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} /> Sync
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pendingSessionId && (
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#5F6F65]">
                <RefreshCw size={12} className="animate-spin" />
                Waiting for Stripe authentication in browser…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {section === 'transactions' && (
        <div className={`${card} p-6 space-y-5`}>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <input
              value={txnFilter.search}
              onChange={e => { setTxnFilter(f => ({ ...f, search: e.target.value })); setTxnPage(0); }}
              placeholder="Search transactions…"
              className="flex-1 min-w-[200px] px-4 py-2.5 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
            />
            <select
              value={txnFilter.category}
              onChange={e => { setTxnFilter(f => ({ ...f, category: e.target.value })); setTxnPage(0); }}
              className="px-4 py-2.5 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filteredTxns.length === 0 ? (
            <div className="text-center py-12 text-[#9C8A7A] text-sm font-medium">
              No transactions found. Link a bank account or add a manual transaction.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F2EFE9]">
                      {['Date', 'Description', 'Category', 'Amount'].map(h => (
                        <th key={h} className="text-left pb-3 text-xs font-black uppercase tracking-wider text-[#9C8A7A]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageTxns.map((txn) => (
                      <tr key={txn.id} className="border-b border-[#FAF8F3] hover:bg-[#FAF8F3] transition-colors">
                        <td className="py-3 pr-4 text-xs font-bold text-[#8A7A6A] whitespace-nowrap">{txn.date}</td>
                        <td className="py-3 pr-4 font-medium text-[#2C2511] max-w-[220px] truncate">
                          {txn.description}
                          {txn.source === 'manual' && (
                            <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-[#B0A090] bg-[#F2EFE9] px-1.5 py-0.5 rounded-full">manual</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={txn.category || 'Other'}
                              onChange={e => handleCategoryOverride(txn.id, e.target.value)}
                              className="text-xs font-bold bg-[#F2EFE9] border-none rounded-lg px-2 py-1 text-[#5F6F65] focus:outline-none focus:ring-1 focus:ring-[#5F6F65]/30"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {txn.categoryOverride && (
                              <span title="Manually overridden"><Tag size={10} className="text-[#D4A373]" /></span>
                            )}
                          </div>
                        </td>
                        <td className={`py-3 font-black text-right whitespace-nowrap ${txn.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {txn.amount >= 0 ? '+' : ''}{centsToDisplay(Math.abs(txn.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-[#9C8A7A]">{filteredTxns.length} transactions</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTxnPage(p => Math.max(0, p - 1))} disabled={txnPage === 0}
                    className="p-2 rounded-lg border border-[#E8E4E1] disabled:opacity-40 hover:bg-[#F2EFE9] transition-colors">
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-xs font-black text-[#2C2511]">{txnPage + 1} / {totalPages}</span>
                  <button onClick={() => setTxnPage(p => Math.min(totalPages - 1, p + 1))} disabled={txnPage >= totalPages - 1}
                    className="p-2 rounded-lg border border-[#E8E4E1] disabled:opacity-40 hover:bg-[#F2EFE9] transition-colors">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PREDICTIONS ── */}
      {section === 'predictions' && (
        <div className="space-y-6">
          {/* Horizon selector */}
          <div className="flex gap-2">
            {[3, 6, 12].map(h => (
              <button key={h} onClick={() => setHorizon(h)}
                className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${
                  horizon === h ? 'bg-[#5F6F65] text-white' : 'bg-[#F2EFE9] text-[#8A7A6A] hover:bg-[#E8E4E1]'
                }`}>
                {h} Months
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`${card} p-5 text-center`}>
              <div className="text-xs font-black uppercase tracking-wider text-[#9C8A7A] mb-2">Annualized Run Rate</div>
              <div className="text-2xl font-black text-[#2C2511]">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(predictions.annualizedRun / 100)}
              </div>
            </div>
            <div className={`${card} p-5 text-center`}>
              <div className="text-xs font-black uppercase tracking-wider text-[#9C8A7A] mb-2">Revenue Trend</div>
              <div className="flex items-center justify-center gap-2">
                <TrendIcon size={20} className={predictions.trend === 'up' ? 'text-emerald-500' : predictions.trend === 'down' ? 'text-rose-500' : 'text-[#9C8A7A]'} />
                <span className="text-lg font-black capitalize text-[#2C2511]">{predictions.trend}</span>
              </div>
            </div>
            <div className={`${card} p-5 text-center`}>
              <div className="text-xs font-black uppercase tracking-wider text-[#9C8A7A] mb-2">Data Confidence</div>
              <div className={`text-lg font-black capitalize ${
                predictions.confidence === 'high' ? 'text-emerald-600'
                : predictions.confidence === 'medium' ? 'text-amber-600'
                : 'text-rose-500'
              }`}>{predictions.confidence || 'low'}</div>
              <div className="text-[10px] text-[#B0A090] mt-1">
                {predictions.confidence === 'high' ? '6+ months data'
                  : predictions.confidence === 'medium' ? '3–5 months data'
                  : '< 3 months data'}
              </div>
            </div>
          </div>

          {/* Combined chart */}
          <div className={`${glassCard} p-6`}>
            <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-5">Historical + Predicted Revenue</h3>
            {predChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={predChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5F6F65" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5F6F65" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9FAB6D" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#9FAB6D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11, fill: '#9C8A7A' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${((v || 0) / 100).toFixed(0)}`} tick={{ fontSize: 11, fill: '#9C8A7A' }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="actual" name="Actual" stroke="#5F6F65" strokeWidth={2.5} fill="url(#actualGrad)" connectNulls={false} />
                  <Area type="monotone" dataKey="predicted" name="Predicted" stroke="#9FAB6D" strokeWidth={2} strokeDasharray="5 4" fill="url(#predGrad)" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Add at least 2 months of transaction data to see predictions." />
            )}
          </div>

          {/* Tax impact callout */}
          {taxSnap.totalTax > 0 && (
            <div className="flex items-start gap-4 bg-[#F2EFE9] rounded-2xl px-6 py-5 border border-[#E8E4E1]">
              <Wallet size={20} className="text-[#5F6F65] shrink-0 mt-0.5" />
              <div>
                <div className="font-black text-[#2C2511] text-sm">Tax Impact at This Trajectory</div>
                <div className="text-xs text-[#8A7A6A] mt-1 leading-relaxed">
                  Based on your current YTD net profit, estimated total tax is{' '}
                  <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxSnap.totalTax)}</strong>
                  {' '}(SE + Federal + AZ State). Recommended quarterly payment:{' '}
                  <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxSnap.quarterlyEstimate)}</strong>.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showManual && <ManualTxnModal onSave={handleAddManual} onClose={() => setShowManual(false)} />}
    </div>
  );
};

const EmptyChart = ({ message }) => (
  <div className="flex items-center justify-center h-40 text-[#9C8A7A] text-xs font-bold text-center px-6">
    {message}
  </div>
);

export default BusinessHealthView;
