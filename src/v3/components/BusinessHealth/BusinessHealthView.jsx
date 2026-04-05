import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Link, RefreshCw, DollarSign, TrendingUp, TrendingDown, Minus,
  BarChart2, Tag, AlertCircle, Wallet, Plus, X,
  ArrowLeft, ArrowRight, Download, Zap,
  Eye, EyeOff, Trash2, Edit3, Check, Target, Calendar,
  Filter, SortAsc, SortDesc, BookOpen, Receipt,
  Sparkles, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';
import MetricCard from '../Dashboard/MetricCard';
import { CATEGORIES, SCHEDULE_C_MAP, categorizeWithRules } from '../../utils/categorizer';
import {
  buildPL, predictRevenue, deriveTaxLiability,
  getTopExpenseCategories, getMonthOverMonthChange, centsToDisplay,
  getTopMerchants, getProfitMargin, getRunway, exportCSV,
} from '../../utils/financialEngine';
import { streamGemini } from '../../utils/geminiApi';

// ─── Palette / shared styles ─────────────────────────────────────────────────
const CHART_COLORS = ['#5F6F65', '#D4A373', '#7A8C82', '#C4847A', '#9FAB6D', '#B5956A', '#8B9E94', '#E8C49A'];
const card       = 'bg-white rounded-3xl border border-[#E8E4E1] shadow-sm';
const glassCard  = 'bg-white/70 backdrop-blur-sm rounded-3xl border border-white/40 shadow-xl';
const inputCls   = 'w-full px-3 py-2.5 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30';
const labelCls   = 'text-xs font-black uppercase tracking-wider text-[#8A7A6A] block mb-1.5';
const btnPrimary = 'flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm bg-[#5F6F65] text-white hover:bg-[#4A6657] transition-all active:scale-95';
const btnGhost   = 'flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm border border-[#E8E4E1] text-[#8A7A6A] hover:bg-[#F2EFE9] transition-all';

const formatMonth = (m) => {
  if (!m) return '';
  const [yr, mo] = m.split('-');
  return new Date(Number(yr), Number(mo) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#2C2511] text-[#FAF8F3] rounded-xl px-3 py-2 text-xs font-bold shadow-xl">
      <div className="mb-1 opacity-70">{formatMonth(label) || label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }} className="flex gap-2">
          <span>{p.name}:</span><span>{centsToDisplay(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-[#9C8A7A]">
    <Icon size={36} className="mb-3 opacity-20" />
    <p className="text-sm font-medium text-center max-w-xs">{message}</p>
  </div>
);

// ─── Manual Transaction Modal ─────────────────────────────────────────────────
const ManualTxnModal = ({ allCategories, onSave, onClose }) => {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '', amountStr: '', type: 'expense', category: 'Other',
  });
  const handleSave = () => {
    const raw = parseFloat(form.amountStr.replace(/[^0-9.]/g, ''));
    if (!raw || !form.description.trim()) return;
    const cents = Math.round(raw * 100) * (form.type === 'income' ? 1 : -1);
    onSave({ id: `manual_${Date.now()}`, accountId: 'manual', date: form.date, description: form.description.trim(), amount: cents, category: form.type === 'income' ? 'Income' : form.category, categoryOverride: true, source: 'manual' });
  };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-[#E8E4E1]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-[#2C2511]">Add Manual Transaction</h3>
          <button onClick={onClose} className="text-[#9C8A7A] hover:text-[#2C2511]"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Client payment — Jones Wedding" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}><option value="income">Income</option><option value="expense">Expense</option></select></div>
            <div><label className={labelCls}>Amount ($)</label><input value={form.amountStr} onChange={e => setForm(f => ({ ...f, amountStr: e.target.value }))} placeholder="0.00" className={inputCls} /></div>
          </div>
          {form.type === 'expense' && (
            <div><label className={labelCls}>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>{allCategories.filter(c => c !== 'Income').map(c => <option key={c}>{c}</option>)}</select></div>
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

// ─── Transaction Detail Drawer ────────────────────────────────────────────────
const TxnDetailDrawer = ({ txn, allCategories, onClose, onUpdate, onCreateRule, apiKey }) => {
  const [cat, setCat]     = useState(txn.category || 'Other');
  const [notes, setNotes] = useState(txn.notes || '');
  const [aiExplain, setAiExplain] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]   = useState('');
  const isDirty = cat !== (txn.category || 'Other') || notes !== (txn.notes || '');
  const isIncome = txn.amount > 0;

  const handleExplain = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiExplain('');
    setAiError('');
    const schedCLine = SCHEDULE_C_MAP[cat] || '';
    const amountDollars = (Math.abs(txn.amount) / 100).toFixed(2);
    const userText = `I'm a sole proprietor photographer. I just categorized a $${amountDollars} transaction (${isIncome ? 'income' : 'expense'}) as "${cat}".
Description: "${txn.description || 'No description'}"
${schedCLine ? `Schedule C line: ${schedCLine}` : ''}

In 2-3 sentences: what does this category mean for my taxes, is this deductible, any IRS rules I should know, and should I keep a receipt?`;

    await streamGemini({
      apiKey,
      model: 'gemini-2.5-flash',
      systemText: 'You are a concise tax assistant for a sole proprietor photography business. Answer in plain English, 2-3 sentences max.',
      userText,
      generationConfig: { maxOutputTokens: 200 },
      onChunk: (text) => setAiExplain(prev => prev + text),
      onDone: () => setAiLoading(false),
      onError: (err) => { setAiError(err.message); setAiLoading(false); },
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-full max-w-sm bg-white shadow-2xl border-l border-[#E8E4E1] flex flex-col h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#F2EFE9]">
          <h3 className="font-black text-[#2C2511] text-base">Transaction Detail</h3>
          <button onClick={onClose} className="text-[#9C8A7A] hover:text-[#2C2511]"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5 flex-1">
          <div className="text-center py-4">
            <div className={`text-4xl font-black ${isIncome ? 'text-[#5F6F65]' : 'text-[#C4847A]'}`}>
              {isIncome ? '+' : '-'}${Math.abs(txn.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-bold text-[#9C8A7A] mt-1 uppercase tracking-wide">{isIncome ? 'Income' : 'Expense'}</div>
          </div>
          <div className="space-y-2.5 bg-[#FAF8F3] rounded-2xl p-4">
            <div className="flex justify-between text-sm"><span className="text-[#9C8A7A] font-bold">Date</span><span className="font-black text-[#2C2511]">{txn.date}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#9C8A7A] font-bold">Source</span><span className="font-black text-[#2C2511] capitalize">{txn.source || 'manual'}</span></div>
          </div>
          <div><label className={labelCls}>Description</label><p className="text-sm font-medium text-[#2C2511] bg-[#FAF8F3] rounded-xl px-3 py-2.5 break-words">{txn.description || '—'}</p></div>
          <div>
            <label className={labelCls}>Category</label>
            <select value={cat} onChange={e => { setCat(e.target.value); setAiExplain(''); }} className={inputCls}>{allCategories.map(c => <option key={c}>{c}</option>)}</select>
            {!isIncome && SCHEDULE_C_MAP[cat] && (
              <p className="mt-1.5 text-[10px] font-bold text-[#5F6F65] bg-[#EEF2F0] rounded-lg px-2.5 py-1.5">{SCHEDULE_C_MAP[cat]}</p>
            )}

            {/* AI Explainer */}
            {!isIncome && (
              <div className="mt-2">
                <button
                  onClick={handleExplain}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-[11px] font-black text-[#5F6F65] hover:text-[#4A6657] transition disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {aiLoading ? 'Explaining…' : 'What does this mean for my taxes?'}
                  <span className="text-[9px] text-[#9C8A7A] font-normal">gemini-3.1-flash-lite</span>
                </button>
                {aiError && <p className="mt-1.5 text-[10px] text-rose-600 font-bold">{aiError}</p>}
                {aiExplain && (
                  <div className="mt-2 bg-[#EEF2F0] rounded-xl px-3 py-2.5">
                    <p className="text-xs text-[#2C2511] leading-relaxed font-medium">{aiExplain}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div><label className={labelCls}>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note…" rows={3} className={`${inputCls} resize-none`} /></div>
        </div>
        <div className="p-6 border-t border-[#F2EFE9] space-y-2">
          {isDirty && <button onClick={() => onUpdate(txn.id, { category: cat, categoryOverride: true, notes })} className={`${btnPrimary} w-full justify-center`}><Check size={14} /> Save Changes</button>}
          {!isIncome && txn.description && (
            <button onClick={() => onCreateRule({ pattern: txn.description, category: cat })} className={`${btnGhost} w-full justify-center text-xs`}>
              <Zap size={13} /> Always categorize similar as {cat}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Rule Modal ───────────────────────────────────────────────────────────────
const RuleModal = ({ initial, allCategories, onSave, onClose }) => {
  const [pattern,  setPattern]  = useState(initial?.pattern  || '');
  const [category, setCategory] = useState(initial?.category || 'Software');
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl border border-[#E8E4E1]">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-black text-[#2C2511]">{initial?.id ? 'Edit Rule' : 'New Rule'}</h3>
          <button onClick={onClose} className="text-[#9C8A7A] hover:text-[#2C2511]"><X size={18} /></button>
        </div>
        <p className="text-xs text-[#9C8A7A] font-medium mb-5">If the description contains this text, automatically assign the category.</p>
        <div className="space-y-4">
          <div><label className={labelCls}>Description contains</label><input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="e.g. adobe, starbucks, shell" className={inputCls} autoFocus /></div>
          <div><label className={labelCls}>Assign category</label><select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>{allCategories.filter(c => c !== 'Income').map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-black text-sm border border-[#E8E4E1] text-[#8A7A6A] hover:bg-[#F2EFE9]">Cancel</button>
          <button onClick={() => pattern.trim() && onSave({ id: initial?.id, pattern: pattern.trim(), category })} disabled={!pattern.trim()} className="flex-1 py-3 rounded-xl font-black text-sm bg-[#5F6F65] text-white hover:bg-[#4A6657] disabled:opacity-40">
            {initial?.id ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BusinessHealthView = () => {
  const { state, updateState } = useAppState();

  const [section, setSection]   = useState('overview');
  const [horizon, setHorizon]   = useState(6);
  const [isSyncing, setIsSyncing]   = useState(false);
  const [syncError, setSyncError]   = useState(null);
  const [isLinking, setIsLinking]   = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState(null);
  const [linkUrl, setLinkUrl]       = useState(null);
  const linkTimeoutRef              = useRef(null);
  const [showManual, setShowManual] = useState(false);
  const [detailTxn, setDetailTxn]   = useState(null);
  const [selectedTxns, setSelectedTxns] = useState(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [txnFilter, setTxnFilter] = useState({
    category: 'all', search: '', dateRange: 'all', source: 'all',
    sortBy: 'date', sortDir: 'desc', minAmount: '', maxAmount: '',
    customFrom: '', customTo: '',
  });
  const [txnPage, setTxnPage]         = useState(0);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleModalInit, setRuleModalInit] = useState(null);
  const [showTaxDetail, setShowTaxDetail] = useState(false);
  const [newIgnored, setNewIgnored]     = useState('');
  const [newCustomCat, setNewCustomCat] = useState('');
  const [aiSnapshot, setAiSnapshot]     = useState('');
  const [aiSnapshotLoading, setAiSnapshotLoading] = useState(false);
  const [aiSnapshotError, setAiSnapshotError]     = useState('');
  const [aiSnapshotOpen, setAiSnapshotOpen]       = useState(false);
  const apiKey = state.geminiKey || '';

  // ── Derived data
  const transactions  = useMemo(() => state.transactions  || [], [state.transactions]);
  const bankAccounts  = useMemo(() => state.bankAccounts  || [], [state.bankAccounts]);
  const categoryRules = useMemo(() => state.categoryRules || [], [state.categoryRules]);
  const finSettings   = useMemo(() => ({
    syncFrequencyMinutes: 30, autoCategorize: true, ignoredMerchants: [], customCategories: [],
    ...(state.financialSettings || {}),
  }), [state.financialSettings]);

  const allCategories = useMemo(() => {
    const custom = finSettings.customCategories || [];
    return [...CATEGORIES, ...custom.filter(c => !CATEGORIES.includes(c))];
  }, [finSettings.customCategories]);

  const pl           = useMemo(() => buildPL(transactions),                   [transactions]);
  const taxSnap      = useMemo(() => deriveTaxLiability(transactions),         [transactions]);
  const topExp       = useMemo(() => getTopExpenseCategories(transactions, 8), [transactions]);
  const predictions  = useMemo(() => predictRevenue(transactions, horizon),    [transactions, horizon]);
  const mom          = useMemo(() => getMonthOverMonthChange(pl.months),       [pl.months]);
  const topMerchants = useMemo(() => getTopMerchants(transactions, 10),        [transactions]);
  const profitMargin = useMemo(() => getProfitMargin(pl),                      [pl]);
  const runway       = useMemo(() => getRunway(transactions, bankAccounts),    [transactions, bankAccounts]);

  // ── Date range
  const dateRange = useMemo(() => {
    const now = new Date(), today = now.toISOString().slice(0, 10);
    switch (txnFilter.dateRange) {
      case 'this_month': return { from: now.toISOString().slice(0, 7) + '-01', to: today };
      case 'last_30':    return { from: new Date(now - 30*864e5).toISOString().slice(0, 10), to: today };
      case 'last_90':    return { from: new Date(now - 90*864e5).toISOString().slice(0, 10), to: today };
      case 'this_year':  return { from: now.getFullYear() + '-01-01', to: today };
      case 'custom':     return { from: txnFilter.customFrom, to: txnFilter.customTo };
      default:           return { from: '', to: '' };
    }
  }, [txnFilter.dateRange, txnFilter.customFrom, txnFilter.customTo]);

  // ── Filtered + sorted transactions
  const PAGE_SIZE = 50;
  const filteredTxns = useMemo(() => {
    const q = txnFilter.search.toLowerCase();
    const { from, to } = dateRange;
    const minC = txnFilter.minAmount ? parseFloat(txnFilter.minAmount) * 100 : null;
    const maxC = txnFilter.maxAmount ? parseFloat(txnFilter.maxAmount) * 100 : null;
    return [...transactions]
      .filter(t => {
        if (txnFilter.category !== 'all' && t.category !== txnFilter.category) return false;
        if (txnFilter.source   !== 'all' && t.source   !== txnFilter.source)   return false;
        if (q && !(t.description || '').toLowerCase().includes(q)) return false;
        if (from && t.date < from) return false;
        if (to   && t.date > to)   return false;
        if (minC !== null && Math.abs(t.amount) < minC) return false;
        if (maxC !== null && Math.abs(t.amount) > maxC) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if      (txnFilter.sortBy === 'date')        cmp = (a.date || '').localeCompare(b.date || '');
        else if (txnFilter.sortBy === 'amount')      cmp = Math.abs(a.amount) - Math.abs(b.amount);
        else if (txnFilter.sortBy === 'description') cmp = (a.description || '').localeCompare(b.description || '');
        else if (txnFilter.sortBy === 'category')    cmp = (a.category || '').localeCompare(b.category || '');
        return txnFilter.sortDir === 'desc' ? -cmp : cmp;
      });
  }, [transactions, txnFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredTxns.length / PAGE_SIZE));
  const pageTxns   = filteredTxns.slice(txnPage * PAGE_SIZE, (txnPage + 1) * PAGE_SIZE);

  // ── Chart data
  const plChartData = pl.months.slice(-12).map(m => ({ month: m.month, 'Business Income': m.grossIncome, 'Other Deposits': m.otherDeposits || 0, Expenses: m.totalExpenses }));
  const predChartData = useMemo(() => {
    const hist = (predictions.historical || []).slice(-6).map(h => ({ month: h.month, Actual: h.actual, Predicted: null }));
    const pred = (predictions.predicted  || []).map(p => ({ month: p.month, Actual: null, Predicted: p.predicted }));
    return [...hist, ...pred];
  }, [predictions]);
  const pieData = topExp.map((e, i) => ({ name: e.category, value: e.total, color: CHART_COLORS[i % CHART_COLORS.length] }));

  // ── Auto-sync on mount
  useEffect(() => {
    if (bankAccounts.length === 0) return;
    const run = async () => {
      for (const acct of bankAccounts) {
        try { const res = await window.electronAPI?.stripeSyncTransactions?.({ accountId: acct.id }); if (res?.success) mergeTransactions(res.transactions); } catch (_) {}
      }
    };
    run();
    const mins = finSettings.syncFrequencyMinutes;
    if (mins > 0) { const iv = setInterval(run, mins * 60 * 1000); return () => clearInterval(iv); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.electronAPI?.onStripeAuthComplete?.(async ({ sessionId: returnedSid }) => {
      if (linkTimeoutRef.current) clearTimeout(linkTimeoutRef.current);
      const sid = returnedSid || pendingSessionId;
      if (!sid) { cancelLink(); return; }
      const res = await window.electronAPI.stripeGetAccounts({ sessionId: sid });
      if (res?.success && res.accounts.length > 0) {
        const existing = state.bankAccounts || [];
        const newAccts = res.accounts.filter(a => !existing.find(e => e.id === a.id));
        if (newAccts.length > 0) {
          updateState({ bankAccounts: [...existing, ...newAccts] });
          for (const acct of newAccts) { const txRes = await window.electronAPI?.stripeSyncTransactions?.({ accountId: acct.id }); if (txRes?.success) mergeTransactions(txRes.transactions); }
        }
      } else if (!res?.success) { setSyncError(res?.error || 'Could not retrieve linked accounts.'); }
      cancelLink();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mergeTransactions = useCallback((incoming = []) => {
    updateState(prev => {
      const existing = prev.transactions || [], existingIds = new Set(existing.map(t => t.id));
      const rules = prev.categoryRules || [], auto = (prev.financialSettings?.autoCategorize) !== false;
      const newTxns = incoming.filter(t => !existingIds.has(t.id)).map(t => ({ ...t, category: auto ? categorizeWithRules(t, rules) : 'Other', categoryOverride: false }));
      if (newTxns.length === 0) return prev;
      return { ...prev, transactions: [...existing, ...newTxns] };
    });
  }, [updateState]);

  const cancelLink = useCallback(() => {
    if (linkTimeoutRef.current) clearTimeout(linkTimeoutRef.current);
    linkTimeoutRef.current = null; setPendingSessionId(null); setLinkUrl(null); setIsLinking(false);
  }, []);

  const handleLinkAccount = async () => {
    if (!window.electronAPI?.stripeCreateLinkSession) { setSyncError('Stripe not available in browser mode.'); return; }
    if (linkTimeoutRef.current) clearTimeout(linkTimeoutRef.current);
    setIsLinking(true); setSyncError(null);
    const res = await window.electronAPI.stripeCreateLinkSession();
    if (!res?.success) { setSyncError(res?.error || 'Failed to start Stripe link session.'); cancelLink(); return; }
    setPendingSessionId(res.sessionId);
    const publishableKey = state.stripePublishableKey || '';
    if (!publishableKey) { setSyncError('Publishable key missing. Add pk_live_… in Settings → Stripe Integration.'); cancelLink(); return; }
    const linkRes = await window.electronAPI.stripeOpenLinkWindow({ clientSecret: res.clientSecret, publishableKey, sessionId: res.sessionId });
    if (!linkRes?.success) { setSyncError(linkRes?.error || 'Failed to open bank link page.'); cancelLink(); return; }
    if (linkRes.url) setLinkUrl(linkRes.url);
    linkTimeoutRef.current = setTimeout(() => { cancelLink(); setSyncError('Bank link timed out. Try again.'); }, 10 * 60 * 1000);
  };

  const handleSync = async (accountId) => {
    setIsSyncing(true); setSyncError(null);
    const res = await window.electronAPI?.stripeSyncTransactions?.({ accountId });
    if (res?.success) mergeTransactions(res.transactions); else setSyncError(res?.error || 'Sync failed.');
    setIsSyncing(false);
  };

  const handleTxnUpdate = useCallback((txnId, patch) => {
    updateState(prev => ({ ...prev, transactions: (prev.transactions || []).map(t => t.id === txnId ? { ...t, ...patch } : t) }));
    setDetailTxn(prev => prev?.id === txnId ? { ...prev, ...patch } : prev);
  }, [updateState]);

  const handleCategoryOverride = useCallback((txnId, newCat) => {
    updateState(prev => ({ ...prev, transactions: (prev.transactions || []).map(t => t.id === txnId ? { ...t, category: newCat, categoryOverride: true } : t) }));
  }, [updateState]);

  const handleApplyRules = () => {
    updateState(prev => ({ ...prev, transactions: (prev.transactions || []).map(t => t.categoryOverride ? t : { ...t, category: categorizeWithRules(t, prev.categoryRules || []) }) }));
  };

  const handleBulkCategorize = () => {
    if (!bulkCategory || selectedTxns.size === 0) return;
    updateState(prev => ({ ...prev, transactions: (prev.transactions || []).map(t => selectedTxns.has(t.id) ? { ...t, category: bulkCategory, categoryOverride: true } : t) }));
    setSelectedTxns(new Set()); setBulkCategory('');
  };

  const handleBulkDelete = () => {
    if (selectedTxns.size === 0) return;
    updateState(prev => ({ ...prev, transactions: (prev.transactions || []).filter(t => !selectedTxns.has(t.id)) }));
    setSelectedTxns(new Set());
  };

  const handleSaveRule = ({ id, pattern, category }) => {
    updateState(prev => {
      const rules = [...(prev.categoryRules || [])];
      if (id) { const idx = rules.findIndex(r => r.id === id); if (idx >= 0) rules[idx] = { id, pattern, category }; }
      else rules.push({ id: `rule_${Date.now()}`, pattern, category });
      return { ...prev, categoryRules: rules };
    });
    setShowRuleModal(false); setRuleModalInit(null);
  };

  const handleExportCSV = () => {
    const csv  = exportCSV(filteredTxns.length > 0 ? filteredTxns : transactions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `az-photo-transactions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const setSort = (col) => {
    setTxnFilter(f => ({ ...f, sortBy: col, sortDir: f.sortBy === col && f.sortDir === 'desc' ? 'asc' : 'desc' }));
    setTxnPage(0);
  };

  const SortIcon = ({ col }) => txnFilter.sortBy !== col
    ? <SortAsc size={11} className="opacity-30" />
    : txnFilter.sortDir === 'desc' ? <SortDesc size={11} /> : <SortAsc size={11} />;

  const sectionBtnCls = (id) => `px-5 py-2.5 rounded-xl font-black text-sm transition-all ${section === id ? 'bg-[#5F6F65] text-white shadow-sm' : 'text-[#8A7A6A] hover:bg-[#F2EFE9]'}`;
  const TrendIcon = predictions.trend === 'up' ? TrendingUp : predictions.trend === 'down' ? TrendingDown : Minus;
  const uncategorizedCount = transactions.filter(t => t.category === 'Other' && t.amount < 0).length;

  // ══════════════════════════════════════════════════════════════════════════
  const handleAiSnapshot = async () => {
    if (aiSnapshotLoading) return;
    setAiSnapshotLoading(true);
    setAiSnapshotError('');
    setAiSnapshot('');
    setAiSnapshotOpen(true);

    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    const income  = pl.ytd.grossIncome  / 100;
    const expense = pl.ytd.totalExpenses / 100;
    const net     = pl.ytd.netProfit    / 100;
    const margin  = profitMargin;
    const runwayMo = runway.months;
    const taxDue  = taxSnap.totalTax || 0;
    const quarterly = taxSnap.quarterlyEstimate || 0;
    const yoy = mom;
    const year  = new Date().getFullYear();

    const userText = `Provide a plain-English business health summary for my photography business (${year} YTD):

- YTD Revenue: ${fmt(income)}
- YTD Expenses: ${fmt(expense)}
- Net Profit: ${fmt(net)}
- Profit Margin: ${margin.toFixed(1)}%
- Revenue MoM change: ${yoy.incomeChange > 0 ? '+' : ''}${yoy.incomeChange.toFixed(1)}%
- Expense MoM change: ${yoy.expenseChange > 0 ? '+' : ''}${yoy.expenseChange.toFixed(1)}%
- Cash Runway: ${runwayMo === null ? 'unknown' : runwayMo + ' months'}
- Estimated Tax Due: ${fmt(taxDue)} (~${fmt(quarterly)} quarterly)

Write 3-4 sentences in plain English summarizing: (1) business performance trend, (2) margin / cash health, (3) one specific financial action to take. Be direct, specific, and actionable — no fluff.`;

    await streamGemini({
      apiKey,
      model: 'gemini-2.5-flash',
      systemText: 'You are a direct, practical business advisor for a sole proprietor photography business. Summarize financial health in plain English. No bullet points — narrative sentences only.',
      userText,
      generationConfig: { maxOutputTokens: 250 },
      onChunk: (text) => setAiSnapshot(prev => prev + text),
      onDone: () => setAiSnapshotLoading(false),
      onError: (err) => { setAiSnapshotError(err.message); setAiSnapshotLoading(false); },
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  const renderOverview = () => (
    <div className="space-y-6">
      {/* AI Business Snapshot */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        aiSnapshotOpen ? 'border-[#5F6F65]/30 bg-gradient-to-br from-[#EEF2F0] to-[#F2EFE9]' : 'border-[#E8E4E1] bg-white'
      }`}>
        <button
          onClick={() => {
            if (!aiSnapshotOpen && !aiSnapshot && !aiSnapshotLoading) handleAiSnapshot();
            else setAiSnapshotOpen(v => !v);
          }}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#5F6F65] flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-black text-[#2C2511]">AI Business Snapshot</span>
              <span className="ml-2 text-[10px] font-bold text-[#5F6F65] bg-[#DDECD8] px-2 py-0.5 rounded-full">gemini-2.5-flash</span>
            </div>
            {!aiSnapshotOpen && !aiSnapshot && (
              <span className="text-xs text-[#9C8A7A] font-medium ml-1">— plain-English summary of your financials</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {aiSnapshot && !aiSnapshotLoading && (
              <button
                onClick={(e) => { e.stopPropagation(); handleAiSnapshot(); }}
                className="text-[10px] font-black text-[#5F6F65] hover:text-[#4A6657] px-2 py-1 bg-white/60 rounded-lg transition"
              >
                Refresh
              </button>
            )}
            {aiSnapshotLoading
              ? <Loader2 size={15} className="animate-spin text-[#5F6F65]" />
              : aiSnapshotOpen
                ? <ChevronUp size={16} className="text-[#9C8A7A]" />
                : <ChevronDown size={16} className="text-[#9C8A7A]" />
            }
          </div>
        </button>

        {aiSnapshotOpen && (
          <div className="px-5 pb-5">
            {aiSnapshotError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-bold text-rose-700">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{aiSnapshotError}</span>
              </div>
            )}
            {aiSnapshot
              ? <p className="text-sm text-[#2C2511] leading-relaxed font-medium">{aiSnapshot}</p>
              : aiSnapshotLoading
                ? <div className="flex items-center gap-2 text-sm text-[#9C8A7A] font-medium"><Loader2 size={14} className="animate-spin" />Analyzing your financials…</div>
                : null
            }
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="YTD Business Income" value={pl.ytd.grossIncome / 100} icon={DollarSign} accent="sage" subtext={`${mom.incomeChange > 0?'+':''}${mom.incomeChange.toFixed(1)}% vs prior month`} />
        <MetricCard title="YTD Expenses"   value={pl.ytd.totalExpenses / 100} icon={Tag}        accent="amber"   subtext={`${mom.expenseChange > 0?'+':''}${mom.expenseChange.toFixed(1)}% vs prior month`} />
        <MetricCard title="YTD Net Profit" value={pl.ytd.netProfit / 100}     icon={TrendingUp} accent={pl.ytd.netProfit >= 0 ? 'emerald' : 'amber'} subtext={`${mom.netChange > 0?'+':''}${mom.netChange.toFixed(1)}% vs prior month`} />
        <MetricCard title="Profit Margin"  value={profitMargin}               icon={BarChart2}  accent="sage"    subtext="of gross revenue" format="percent" />
        <MetricCard title="Est. Tax Due"   value={taxSnap.totalTax || 0}      icon={Wallet}     accent="charcoal" subtext={`~${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(taxSnap.quarterlyEstimate||0)} quarterly`} />
        <div className={`${card} p-5 flex flex-col justify-between`}>
          <div className="text-xs font-black uppercase tracking-wider text-[#9C8A7A] mb-2">Cash Runway</div>
          <div className="text-2xl font-black text-[#2C2511]">{runway.months === null ? '—' : runway.months > 99 ? '99+ mo' : `${runway.months} mo`}</div>
          <div className="text-xs text-[#9C8A7A] font-medium mt-1">{runway.avgBurnCents > 0 ? `${centsToDisplay(runway.avgBurnCents)}/mo avg burn` : 'No burn data yet'}</div>
        </div>
      </div>

      {uncategorizedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-3.5 text-sm font-bold">
          <AlertCircle size={15} className="shrink-0" />
          <span>{uncategorizedCount} transaction{uncategorizedCount > 1 ? 's' : ''} need categorizing</span>
          <button onClick={() => { setSection('transactions'); setTxnFilter(f => ({ ...f, category: 'Other' })); }} className="ml-auto text-xs px-3 py-1 bg-amber-100 rounded-lg hover:bg-amber-200 transition-all">Review →</button>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`${glassCard} p-6 lg:col-span-2`}>
          <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-5">Monthly P&amp;L</h3>
          {plChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={plChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5F6F65" stopOpacity={0.25} /><stop offset="95%" stopColor="#5F6F65" stopOpacity={0} /></linearGradient>
                  <linearGradient id="otherGrad"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9FAB6D" stopOpacity={0.2}  /><stop offset="95%" stopColor="#9FAB6D" stopOpacity={0} /></linearGradient>
                  <linearGradient id="expGrad"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4A373" stopOpacity={0.25} /><stop offset="95%" stopColor="#D4A373" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11, fill: '#9C8A7A' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v/100).toFixed(0)}`} tick={{ fontSize: 11, fill: '#9C8A7A' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Business Income" stroke="#5F6F65" strokeWidth={2.5} fill="url(#incomeGrad)" name="Business Income" />
                <Area type="monotone" dataKey="Other Deposits"  stroke="#9FAB6D" strokeWidth={1.5} fill="url(#otherGrad)"  name="Other Deposits" strokeDasharray="4 2" />
                <Area type="monotone" dataKey="Expenses"        stroke="#D4A373" strokeWidth={2.5} fill="url(#expGrad)"    name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart2} message="No data yet. Link a bank account or add a manual transaction." />}
        </div>
        <div className={`${card} p-6`}>
          <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-5">Expense Breakdown</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">{pieData.map((e,i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={(v) => centsToDisplay(v)} contentStyle={{ background:'#2C2511', color:'#FAF8F3', border:'none', borderRadius:12, fontSize:12, fontWeight:700 }} /></PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">{pieData.map((d,i) => (<div key={i} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full shrink-0" style={{background:d.color}} /><span className="font-bold text-[#8A7A6A]">{d.name}</span></div><span className="font-black text-[#2C2511]">{centsToDisplay(d.value)}</span></div>))}</div>
            </>
          ) : <EmptyState icon={Tag} message="No expenses recorded yet." />}
        </div>
      </div>

      {/* Tax breakdown + Accounts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Tax Estimate Breakdown</h3>
            <button onClick={() => setShowTaxDetail(v => !v)} className="text-xs font-bold text-[#5F6F65] flex items-center gap-1">{showTaxDetail ? <EyeOff size={12}/> : <Eye size={12}/>} {showTaxDetail ? 'Hide' : 'Show'} math</button>
          </div>
          {taxSnap.totalTax > 0 ? (
            <>
              <div className="space-y-2.5">
                {[{label:'Self-Employment Tax (15.3%)',value:taxSnap.seTax,desc:'SE on net profit'},{label:'Federal Income Tax',value:taxSnap.fedTax,desc:'Progressive brackets'},{label:'AZ State Tax (2.5%)',value:taxSnap.azTax,desc:'Flat rate'}].map(({label,value,desc}) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[#F2EFE9] last:border-0">
                    <div><div className="text-sm font-bold text-[#2C2511]">{label}</div>{showTaxDetail && <div className="text-xs text-[#9C8A7A]">{desc}</div>}</div>
                    <span className="font-black text-[#C4847A] text-sm">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value||0)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2"><span className="font-black text-[#2C2511] text-sm">Total Est. Liability</span><span className="font-black text-[#2C2511] text-lg">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(taxSnap.totalTax||0)}</span></div>
              </div>
              {showTaxDetail && (
                <div className="mt-4 bg-[#FAF8F3] rounded-2xl p-4 text-xs text-[#8A7A6A] space-y-1 font-medium">
                  <div className="font-black text-[#5F6F65] mb-2">How it's calculated</div>
                  <div>Gross Revenue: <strong>{centsToDisplay(pl.ytd.grossIncome)}</strong></div>
                  <div>− Expenses: <strong>{centsToDisplay(pl.ytd.totalExpenses)}</strong></div>
                  <div>= Net Profit: <strong>{centsToDisplay(pl.ytd.netProfit)}</strong> (taxable base)</div>
                  <div className="pt-1 border-t border-[#E8E4E1]">SE Tax: net profit × 92.35% × 15.3%</div>
                  <div>Federal: progressive brackets on (net profit − ½ SE tax)</div>
                  <div>AZ State: taxable income × 2.5%</div>
                </div>
              )}
              <div className="mt-4 bg-[#5F6F65]/8 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-[#5F6F65]">Next quarterly estimate</span>
                <span className="font-black text-[#5F6F65]">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(taxSnap.quarterlyEstimate||0)}</span>
              </div>
            </>
          ) : <EmptyState icon={Wallet} message="Add transactions to see your tax estimate." />}
        </div>

        <div className={`${card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Linked Accounts</h3>
            {isLinking ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-xs bg-[#5F6F65] text-white opacity-60"><RefreshCw size={12} className="animate-spin" /> Opening…</div>
                {linkUrl && <button onClick={() => window.electronAPI?.openExternal?.(linkUrl)} className="px-3 py-1.5 rounded-xl font-black text-xs bg-[#D4A373] text-white hover:bg-[#C49060]">Open Manually</button>}
                <button onClick={cancelLink} className={`${btnGhost} text-xs py-1.5`}>Cancel</button>
              </div>
            ) : (
              <button onClick={handleLinkAccount} className={`${btnPrimary} text-xs py-1.5`}><Link size={12} /> Link Account</button>
            )}
          </div>
          {bankAccounts.length === 0 ? <EmptyState icon={Wallet} message="No accounts linked. Click Link Account to connect via Stripe." /> : (
            <div className="space-y-3">
              {bankAccounts.map(acct => (
                <div key={acct.id} className="flex items-center justify-between bg-[#FAF8F3] rounded-2xl px-4 py-3">
                  <div><div className="font-black text-sm text-[#2C2511]">{acct.displayName || acct.institutionName}</div><div className="text-xs text-[#9C8A7A] font-medium">••••{acct.last4} · {acct.institutionName}</div></div>
                  <div className="text-right">
                    {acct.balance != null ? <div className="font-black text-[#5F6F65] text-sm">{centsToDisplay(acct.balance)}</div> : <div className="text-xs text-[#9C8A7A]">Balance N/A</div>}
                    <button onClick={() => handleSync(acct.id)} disabled={isSyncing} className="text-xs font-bold text-[#5F6F65] hover:underline disabled:opacity-40 flex items-center gap-1 mt-0.5 ml-auto"><RefreshCw size={10} className={isSyncing?'animate-spin':''} /> Sync</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  const renderTransactions = () => (
    <div className="space-y-4">
      <div className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8A7A]" />
            <input value={txnFilter.search} onChange={e => { setTxnFilter(f => ({ ...f, search: e.target.value })); setTxnPage(0); }} placeholder="Search transactions…" className={`${inputCls} pl-8`} />
          </div>
          <select value={txnFilter.category} onChange={e => { setTxnFilter(f => ({ ...f, category: e.target.value })); setTxnPage(0); }} className={`${inputCls} w-auto`}>
            <option value="all">All Categories</option>{allCategories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={txnFilter.dateRange} onChange={e => { setTxnFilter(f => ({ ...f, dateRange: e.target.value })); setTxnPage(0); }} className={`${inputCls} w-auto`}>
            <option value="all">All Time</option><option value="this_month">This Month</option><option value="last_30">Last 30 Days</option><option value="last_90">Last 90 Days</option><option value="this_year">This Year</option><option value="custom">Custom</option>
          </select>
          <select value={txnFilter.source} onChange={e => { setTxnFilter(f => ({ ...f, source: e.target.value })); setTxnPage(0); }} className={`${inputCls} w-auto`}>
            <option value="all">All Sources</option><option value="stripe">Bank</option><option value="manual">Manual</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {txnFilter.dateRange === 'custom' && (<><input type="date" value={txnFilter.customFrom} onChange={e => setTxnFilter(f => ({...f, customFrom:e.target.value}))} className={`${inputCls} w-auto`} /><span className="text-[#9C8A7A] text-sm font-bold">to</span><input type="date" value={txnFilter.customTo} onChange={e => setTxnFilter(f => ({...f, customTo:e.target.value}))} className={`${inputCls} w-auto`} /></>)}
          <input value={txnFilter.minAmount} onChange={e => setTxnFilter(f => ({...f, minAmount:e.target.value}))} placeholder="Min $" className={`${inputCls} w-24`} />
          <input value={txnFilter.maxAmount} onChange={e => setTxnFilter(f => ({...f, maxAmount:e.target.value}))} placeholder="Max $" className={`${inputCls} w-24`} />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-[#9C8A7A] font-bold">{filteredTxns.length} results</span>
            <button onClick={handleApplyRules} className={`${btnGhost} text-xs py-1.5`}><Zap size={12} /> Apply Rules</button>
            <button onClick={handleExportCSV}  className={`${btnGhost} text-xs py-1.5`}><Download size={12} /> CSV</button>
            <button onClick={() => setShowManual(true)} className={`${btnPrimary} text-xs py-1.5`}><Plus size={12} /> Add</button>
          </div>
        </div>
      </div>

      {selectedTxns.size > 0 && (
        <div className="flex items-center gap-3 bg-[#5F6F65] text-white rounded-2xl px-5 py-3">
          <span className="text-sm font-black">{selectedTxns.size} selected</span>
          <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className="px-3 py-1.5 rounded-xl text-sm font-bold bg-white/20 text-white border border-white/30 focus:outline-none">
            <option value="">Set category…</option>{allCategories.map(c => <option key={c} className="text-[#2C2511]">{c}</option>)}
          </select>
          <button onClick={handleBulkCategorize} disabled={!bulkCategory} className="px-3 py-1.5 rounded-xl font-black text-sm bg-white text-[#5F6F65] disabled:opacity-40">Apply</button>
          <button onClick={handleBulkDelete} className="px-3 py-1.5 rounded-xl font-black text-sm bg-red-500/80 text-white hover:bg-red-500"><Trash2 size={13} /></button>
          <button onClick={() => setSelectedTxns(new Set())} className="ml-auto text-white/70 hover:text-white"><X size={16} /></button>
        </div>
      )}

      <div className={`${card} overflow-hidden`}>
        {filteredTxns.length === 0 ? <EmptyState icon={BookOpen} message="No transactions match your filters." /> : (
          <>
            <div className="grid grid-cols-[28px_1fr_130px_120px_90px] gap-2 px-5 py-3 bg-[#FAF8F3] border-b border-[#E8E4E1] text-xs font-black uppercase tracking-wider text-[#9C8A7A]">
              <div><input type="checkbox" onChange={e => setSelectedTxns(e.target.checked ? new Set(pageTxns.map(t => t.id)) : new Set())} className="accent-[#5F6F65]" /></div>
              <button onClick={() => setSort('description')} className="flex items-center gap-1 text-left hover:text-[#5F6F65]">Description <SortIcon col="description" /></button>
              <button onClick={() => setSort('date')}        className="flex items-center gap-1 hover:text-[#5F6F65]">Date <SortIcon col="date" /></button>
              <button onClick={() => setSort('category')}    className="flex items-center gap-1 hover:text-[#5F6F65]">Category <SortIcon col="category" /></button>
              <button onClick={() => setSort('amount')}      className="flex items-center gap-1 justify-end hover:text-[#5F6F65]">Amount <SortIcon col="amount" /></button>
            </div>
            {pageTxns.map(txn => {
              const isIncome = txn.amount > 0, isChecked = selectedTxns.has(txn.id);
              const needsReceipt = !isIncome && Math.abs(txn.amount) > 7500;
              const isMemberDraw = txn.category === 'Transfer' && txn.amount < 0;
              const isCapitalAsset = txn.category === 'Equipment' && Math.abs(txn.amount) > 250000;
              const schedCLine = !isIncome ? SCHEDULE_C_MAP[txn.category] : null;
              return (
                <div key={txn.id} className={`grid grid-cols-[28px_1fr_130px_120px_90px] gap-2 px-5 py-3 border-b border-[#F5F2EF] last:border-0 hover:bg-[#FAF8F3] cursor-pointer ${isChecked?'bg-[#5F6F65]/5':''}`} onClick={() => setDetailTxn(txn)}>
                  <div onClick={e => e.stopPropagation()}><input type="checkbox" checked={isChecked} onChange={e => { const next=new Set(selectedTxns); e.target.checked?next.add(txn.id):next.delete(txn.id); setSelectedTxns(next); }} className="accent-[#5F6F65]" /></div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-bold text-[#2C2511] truncate">{txn.description||'—'}</div>
                      {needsReceipt && <Receipt size={12} className="shrink-0 text-amber-500" title="Receipt required (IRS: expenses > $75)" />}
                    </div>
                    {isMemberDraw && (
                      <span className="inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F2EFE9] text-[#8A7A6A] border border-[#E0DAD3]">
                        Member Draw — Non-Deductible
                      </span>
                    )}
                    {isCapitalAsset && (
                      <span className="inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-[#D4A373] border border-amber-200">
                        Capital Asset / §179
                      </span>
                    )}
                    {txn.notes&&<div className="text-xs text-[#9C8A7A] truncate mt-0.5">{txn.notes}</div>}
                  </div>
                  <div className="text-sm text-[#9C8A7A] font-medium self-center">{txn.date}</div>
                  <div className="self-center" onClick={e => e.stopPropagation()}>
                    <select value={txn.category||'Other'} onChange={e => handleCategoryOverride(txn.id, e.target.value)} className="text-xs font-bold bg-transparent border-0 text-[#5F6F65] focus:outline-none cursor-pointer hover:underline truncate max-w-[110px]">
                      {allCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {txn.categoryOverride && <div className="w-1 h-1 rounded-full bg-[#D4A373] inline-block ml-1 align-middle" title="Manually set" />}
                    {schedCLine && (
                      <div className="text-[9px] text-[#B0A090] truncate mt-0.5 max-w-[110px]" title={schedCLine}>{schedCLine}</div>
                    )}
                  </div>
                  <div className={`text-sm font-black self-center text-right ${isIncome?'text-[#5F6F65]':'text-[#C4847A]'}`}>{isIncome?'+':'-'}{centsToDisplay(Math.abs(txn.amount))}</div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-[#9C8A7A] font-bold">Page {txnPage+1} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setTxnPage(p => Math.max(0,p-1))} disabled={txnPage===0} className={`${btnGhost} text-xs py-1.5 disabled:opacity-40`}><ArrowLeft size={13}/> Prev</button>
            <button onClick={() => setTxnPage(p => Math.min(totalPages-1,p+1))} disabled={txnPage>=totalPages-1} className={`${btnGhost} text-xs py-1.5 disabled:opacity-40`}>Next <ArrowRight size={13}/></button>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  const renderBreakdown = () => {
    const totalExp = topExp.reduce((s, e) => s + e.total, 0);
    return (
      <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className={`${card} p-6`}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Category Summary</h3><button onClick={handleExportCSV} className={`${btnGhost} text-xs py-1.5`}><Download size={12}/> CSV</button></div>
            {topExp.length === 0 ? <EmptyState icon={Tag} message="No expenses recorded yet." /> : (
              <div className="space-y-3">
                {topExp.map((e,i) => (
                  <div key={e.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:CHART_COLORS[i%CHART_COLORS.length]}} /><span className="font-bold text-[#2C2511]">{e.category}</span></div>
                      <div className="text-right"><span className="font-black text-[#2C2511]">{centsToDisplay(e.total)}</span><span className="text-[#9C8A7A] ml-2 font-bold">{(e.pct*100).toFixed(1)}%</span></div>
                    </div>
                    <div className="h-1.5 bg-[#F2EFE9] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${e.pct*100}%`, background:CHART_COLORS[i%CHART_COLORS.length]}} /></div>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#F2EFE9] flex justify-between text-sm"><span className="font-black text-[#2C2511]">Total Expenses</span><span className="font-black text-[#C4847A]">{centsToDisplay(totalExp)}</span></div>
              </div>
            )}
          </div>
          <div className={`${card} p-6`}>
            <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-4">Top Merchants</h3>
            {topMerchants.length === 0 ? <EmptyState icon={Tag} message="No expense data yet." /> : (
              <div className="space-y-2">
                {topMerchants.map((m,i) => (
                  <div key={m.name} className="flex items-center justify-between py-2 border-b border-[#F5F2EF] last:border-0">
                    <div className="flex items-center gap-3 min-w-0"><span className="text-xs font-black text-[#9C8A7A] w-4 shrink-0">{i+1}</span><div className="min-w-0"><div className="text-sm font-bold text-[#2C2511] truncate">{m.name}</div><div className="text-xs text-[#9C8A7A]">{m.count} txn{m.count>1?'s':''} · {m.category}</div></div></div>
                    <span className="font-black text-[#C4847A] text-sm shrink-0 ml-2">{centsToDisplay(m.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`${glassCard} p-6`}>
          <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-5">Monthly Expense Trend (Last 12 Months)</h3>
          {pl.months.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pl.months.slice(-12)} margin={{ top:5, right:10, left:0, bottom:0 }}>
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize:11, fill:'#9C8A7A' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v/100).toFixed(0)}`} tick={{ fontSize:11, fill:'#9C8A7A' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="totalExpenses" fill="#D4A373" radius={[6,6,0,0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart2} message="No monthly data yet." />}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  const renderPredictions = () => {
    const revenueTarget = state.revenueTarget || 100000;
    const ytdDollars    = pl.ytd.grossIncome / 100;
    const targetPct     = Math.min(1, ytdDollars / revenueTarget);
    return (
      <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className={`${card} p-6`}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Revenue Target</h3><Target size={16} className="text-[#5F6F65]" /></div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="font-bold text-[#8A7A6A]">YTD Progress</span><span className="font-black text-[#2C2511]">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(ytdDollars)} / {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(revenueTarget)}</span></div>
              <div className="h-3 bg-[#F2EFE9] rounded-full overflow-hidden"><div className="h-full bg-[#5F6F65] rounded-full transition-all duration-700" style={{width:`${targetPct*100}%`}} /></div>
              <div className="text-xs text-[#9C8A7A] font-bold text-right">{(targetPct*100).toFixed(1)}% of goal</div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#F2EFE9] flex justify-between text-sm"><span className="font-bold text-[#8A7A6A]">Annualized Run Rate</span><span className="font-black text-[#5F6F65]">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(predictions.annualizedRun/100)}</span></div>
          </div>
          <div className={`${card} p-6`}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Quarterly Tax Calendar</h3><Calendar size={16} className="text-[#D4A373]" /></div>
            <div className="space-y-2">
              {[{label:'Q1 Est.',due:'Apr 15',color:'#5F6F65'},{label:'Q2 Est.',due:'Jun 16',color:'#7A8C82'},{label:'Q3 Est.',due:'Sep 15',color:'#9FAB6D'},{label:'Q4 Est.',due:'Jan 15',color:'#D4A373'}].map(({label,due,color}) => (
                <div key={label} className="flex items-center justify-between py-2.5 px-4 bg-[#FAF8F3] rounded-xl">
                  <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full" style={{background:color}} /><span className="text-sm font-bold text-[#2C2511]">{label}</span></div>
                  <div className="text-right"><div className="text-xs font-black text-[#9C8A7A]">Due {due}</div><div className="text-sm font-black text-[#2C2511]">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(taxSnap.quarterlyEstimate||0)}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={`${glassCard} p-6`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Revenue Forecast</h3>
            <div className="flex items-center gap-2">
              <TrendIcon size={14} className={predictions.trend==='up'?'text-[#5F6F65]':predictions.trend==='down'?'text-[#C4847A]':'text-[#9C8A7A]'} />
              <span className="text-xs font-black text-[#9C8A7A] capitalize">{predictions.trend} trend · {predictions.confidence} confidence</span>
              <div className="flex gap-1 ml-4">{[3,6,12].map(h => (<button key={h} onClick={() => setHorizon(h)} className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${horizon===h?'bg-[#5F6F65] text-white':'text-[#8A7A6A] hover:bg-[#F2EFE9]'}`}>{h}m</button>))}</div>
            </div>
          </div>
          {predChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={predChartData} margin={{ top:5, right:10, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5F6F65" stopOpacity={0.25}/><stop offset="95%" stopColor="#5F6F65" stopOpacity={0}/></linearGradient>
                  <linearGradient id="predGrad"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4A373" stopOpacity={0.2}/><stop offset="95%" stopColor="#D4A373" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize:11, fill:'#9C8A7A' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => v?`$${(v/100).toFixed(0)}`:''} tick={{ fontSize:11, fill:'#9C8A7A' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Actual"    stroke="#5F6F65" strokeWidth={2.5} fill="url(#actualGrad)" connectNulls name="Actual" />
                <Area type="monotone" dataKey="Predicted" stroke="#D4A373" strokeWidth={2}   fill="url(#predGrad)"   strokeDasharray="5 3" connectNulls name="Predicted" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={TrendingUp} message="Need at least 2 months of data for forecasting." />}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  const renderSettings = () => (
    <div className="space-y-6 max-w-2xl">
      {/* Category Rules */}
      <div className={`${card} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Category Rules</h3><p className="text-xs text-[#9C8A7A] font-medium mt-1">Auto-assign categories when description matches. Runs before built-in rules.</p></div>
          <button onClick={() => { setRuleModalInit(null); setShowRuleModal(true); }} className={`${btnPrimary} text-xs py-1.5`}><Plus size={12}/> New Rule</button>
        </div>
        {categoryRules.length === 0 ? <p className="text-sm text-[#9C8A7A] font-medium py-4 text-center">No rules yet. Create one to auto-sort recurring transactions.</p> : (
          <div className="space-y-2">
            {categoryRules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between bg-[#FAF8F3] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0"><Zap size={13} className="text-[#D4A373] shrink-0" /><span className="text-sm font-bold text-[#2C2511] truncate">"{rule.pattern}"</span><span className="text-xs text-[#9C8A7A] font-bold shrink-0">→ {rule.category}</span></div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <button onClick={() => { setRuleModalInit(rule); setShowRuleModal(true); }} className="text-[#5F6F65] hover:text-[#2C2511]"><Edit3 size={13}/></button>
                  <button onClick={() => updateState(prev => ({ ...prev, categoryRules: (prev.categoryRules||[]).filter(r => r.id !== rule.id) }))} className="text-[#C4847A] hover:text-red-600"><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={handleApplyRules} className={`${btnGhost} text-xs py-1.5 mt-4 w-full justify-center`}><Zap size={12}/> Apply all rules to existing transactions</button>
      </div>

      {/* Sync & Categorization */}
      <div className={`${card} p-6 space-y-5`}>
        <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider">Sync &amp; Categorization</h3>
        <div className="flex items-center justify-between">
          <div><div className="text-sm font-bold text-[#2C2511]">Auto-sync frequency</div><div className="text-xs text-[#9C8A7A] font-medium">How often to pull from linked banks</div></div>
          <select value={finSettings.syncFrequencyMinutes} onChange={e => updateState(prev => ({ ...prev, financialSettings: { ...prev.financialSettings, syncFrequencyMinutes: Number(e.target.value) } }))} className={`${inputCls} w-40`}>
            <option value={15}>Every 15 min</option><option value={30}>Every 30 min</option><option value={60}>Every hour</option><option value={0}>Manual only</option>
          </select>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#F2EFE9]">
          <div><div className="text-sm font-bold text-[#2C2511]">Auto-categorize on sync</div><div className="text-xs text-[#9C8A7A] font-medium">Apply rules + built-ins to new transactions</div></div>
          <button onClick={() => updateState(prev => ({ ...prev, financialSettings: { ...prev.financialSettings, autoCategorize: !prev.financialSettings?.autoCategorize } }))} className={`w-11 h-6 rounded-full transition-all ${finSettings.autoCategorize!==false?'bg-[#5F6F65]':'bg-[#E8E4E1]'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all mx-0.5 ${finSettings.autoCategorize!==false?'translate-x-5':'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Ignored Merchants */}
      <div className={`${card} p-6`}>
        <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-1">Ignored Merchants</h3>
        <p className="text-xs text-[#9C8A7A] font-medium mb-4">Transactions matching these terms are hidden from all P&amp;L calculations.</p>
        <div className="flex gap-2 mb-3">
          <input value={newIgnored} onChange={e => setNewIgnored(e.target.value)} onKeyDown={e => { if (e.key==='Enter'&&newIgnored.trim()) { updateState(prev => ({...prev, financialSettings:{...prev.financialSettings, ignoredMerchants:[...(prev.financialSettings?.ignoredMerchants||[]),newIgnored.trim().toLowerCase()]}})); setNewIgnored(''); }}} placeholder="e.g. zelle, venmo, transfer" className={`${inputCls} flex-1`} />
          <button onClick={() => { if (newIgnored.trim()) { updateState(prev => ({...prev, financialSettings:{...prev.financialSettings, ignoredMerchants:[...(prev.financialSettings?.ignoredMerchants||[]),newIgnored.trim().toLowerCase()]}})); setNewIgnored(''); }}} className={btnPrimary}><Plus size={14}/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(finSettings.ignoredMerchants||[]).map(m => (<span key={m} className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-xs font-bold text-[#2C2511]">{m}<button onClick={() => updateState(prev => ({...prev, financialSettings:{...prev.financialSettings, ignoredMerchants:(prev.financialSettings?.ignoredMerchants||[]).filter(x=>x!==m)}}))} className="text-[#C4847A] hover:text-red-600"><X size={11}/></button></span>))}
        </div>
      </div>

      {/* Custom Categories */}
      <div className={`${card} p-6`}>
        <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-1">Custom Categories</h3>
        <p className="text-xs text-[#9C8A7A] font-medium mb-4">Add categories beyond the 12 built-ins.</p>
        <div className="flex gap-2 mb-3">
          <input value={newCustomCat} onChange={e => setNewCustomCat(e.target.value)} onKeyDown={e => { if (e.key==='Enter'&&newCustomCat.trim()&&!allCategories.includes(newCustomCat.trim())) { updateState(prev => ({...prev, financialSettings:{...prev.financialSettings, customCategories:[...(prev.financialSettings?.customCategories||[]),newCustomCat.trim()]}})); setNewCustomCat(''); }}} placeholder="e.g. Props, Gifts" className={`${inputCls} flex-1`} />
          <button onClick={() => { if (newCustomCat.trim()&&!allCategories.includes(newCustomCat.trim())) { updateState(prev => ({...prev, financialSettings:{...prev.financialSettings, customCategories:[...(prev.financialSettings?.customCategories||[]),newCustomCat.trim()]}})); setNewCustomCat(''); }}} className={btnPrimary}><Plus size={14}/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(finSettings.customCategories||[]).length===0 ? <span className="text-xs text-[#9C8A7A] font-medium">No custom categories yet.</span> : (finSettings.customCategories||[]).map(c => (<span key={c} className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-xs font-bold text-[#2C2511]">{c}<button onClick={() => updateState(prev => ({...prev, financialSettings:{...prev.financialSettings, customCategories:(prev.financialSettings?.customCategories||[]).filter(x=>x!==c)}}))} className="text-[#C4847A] hover:text-red-600"><X size={11}/></button></span>))}
        </div>
      </div>

      {/* Data Management */}
      <div className={`${card} p-6`}>
        <h3 className="text-sm font-black text-[#2C2511] uppercase tracking-wider mb-4">Data Management</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-bold text-[#2C2511]">Clear all transactions</div><div className="text-xs text-[#9C8A7A] font-medium">{transactions.length} stored locally</div></div>
            <button onClick={() => { if (window.confirm('Delete all transactions? This cannot be undone.')) updateState({ transactions: [] }); }} className="px-4 py-2 rounded-xl font-black text-xs border border-red-200 text-red-600 hover:bg-red-50">Clear Transactions</button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#F2EFE9]">
            <div><div className="text-sm font-bold text-[#2C2511]">Remove linked accounts</div><div className="text-xs text-[#9C8A7A] font-medium">{bankAccounts.length} linked</div></div>
            <button onClick={() => { if (window.confirm('Remove all linked bank accounts?')) updateState({ bankAccounts: [] }); }} className="px-4 py-2 rounded-xl font-black text-xs border border-red-200 text-red-600 hover:bg-red-50">Remove Accounts</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2"><BarChart2 size={14}/><span>Business Health</span></div>
          <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">Financial Overview</h2>
          <p className="text-[#8A7A6A] mt-2 text-lg">P&amp;L, transactions, forecasts, and rules — all in one place.</p>
        </div>
        <button onClick={() => setShowManual(true)} className={btnPrimary}><Plus size={16}/> Add Transaction</button>
      </header>

      <div className="flex gap-2 flex-wrap">
        {[['overview','Overview'],['transactions',`Transactions${uncategorizedCount>0?` (${uncategorizedCount}!)`:''}`,],['breakdown','Breakdown'],['predictions','Predictions'],['settings','Settings']].map(([id,label]) => (
          <button key={id} onClick={() => setSection(id)} className={sectionBtnCls(id)}>{label}</button>
        ))}
      </div>

      {syncError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 text-sm font-bold">
          <AlertCircle size={16} className="shrink-0"/>{syncError}<button onClick={() => setSyncError(null)} className="ml-auto"><X size={14}/></button>
        </div>
      )}

      {section==='overview'     && renderOverview()}
      {section==='transactions' && renderTransactions()}
      {section==='breakdown'    && renderBreakdown()}
      {section==='predictions'  && renderPredictions()}
      {section==='settings'     && renderSettings()}

      {showManual && <ManualTxnModal allCategories={allCategories} onSave={txn => { updateState(prev => ({ ...prev, transactions: [txn, ...(prev.transactions||[])] })); setShowManual(false); }} onClose={() => setShowManual(false)} />}
      {detailTxn  && <TxnDetailDrawer txn={detailTxn} allCategories={allCategories} apiKey={apiKey} onClose={() => setDetailTxn(null)} onUpdate={handleTxnUpdate} onCreateRule={({ pattern, category }) => { setRuleModalInit({ pattern, category }); setShowRuleModal(true); setDetailTxn(null); }} />}
      {showRuleModal && <RuleModal initial={ruleModalInit} allCategories={allCategories} onSave={handleSaveRule} onClose={() => { setShowRuleModal(false); setRuleModalInit(null); }} />}
    </div>
  );
};

export default BusinessHealthView;
