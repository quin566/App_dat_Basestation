import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { Mail, Plus, Send, Copy, Trash2, RefreshCw, FileEdit, Edit3, Inbox, ChevronRight, CheckCircle2, AlertCircle, Sparkles, Loader2, X } from 'lucide-react';
import { toast } from '../Toast';
import { streamGemini } from '../../utils/geminiApi';

// Extract {{Token}} placeholders from template text
const extractTokens = (text) => {
  const regex = /\{\{(.*?)\}\}/g;
  const tokens = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) tokens.add(match[1].trim());
  return [...tokens];
};

// Replace {{Token}} with actual values
const renderTemplate = (text, values) => {
  return text.replace(/\{\{(.*?)\}\}/g, (_, token) => values[token.trim()] || `[${token.trim()}]`);
};

// --- AI Draft Panel ---
const AiDraftPanel = ({ onInsert, onClose, apiKey }) => {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');
    setDraft('');

    const systemText = `You are an expert email copywriter for a wedding and portrait photography business called "The Love Lens by Ariana." 
Your emails are warm, professional, and personal. They feel like they're from a real human who cares deeply about their clients.
When writing emails:
- Use a warm, genuine tone — never corporate or stiff
- Include {{ClientName}} and other relevant {{Token}} placeholders for personalization
- Write a complete email with a Subject line and full Body
- Format your response EXACTLY like this:
SUBJECT: [subject line here]

BODY:
[full email body here]

- Keep body text between 80–180 words unless the user asks for longer
- Sign off naturally (e.g. "Warmly, Ariana" or "With love, Ariana")`;

    await streamGemini({
      apiKey,
      model: 'gemini-2.5-flash',
      systemText,
      userText: prompt.trim(),
      generationConfig: { maxOutputTokens: 600 },
      onChunk: (text) => setDraft(prev => prev + text),
      onDone: () => setLoading(false),
      onError: (err) => {
        setError(err.message);
        setLoading(false);
      },
    });
  };

  // Parse subject + body from draft
  const parsed = useMemo(() => {
    const subjectMatch = draft.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = draft.match(/BODY:\s*([\s\S]+)/i);
    return {
      subject: subjectMatch?.[1]?.trim() || '',
      body: bodyMatch?.[1]?.trim() || '',
    };
  }, [draft]);

  return (
    <div className="bg-gradient-to-br from-[#EEF2F0] to-[#F2EFE9] rounded-2xl border border-[#5F6F65]/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#5F6F65] flex items-center justify-center">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="text-sm font-black text-[#2C2511]">AI Email Drafter</span>
          <span className="text-[10px] font-bold text-[#9C8A7A] bg-white/60 px-2 py-0.5 rounded-full">gemini-2.5-flash</span>
        </div>
        <button onClick={onClose} className="text-[#9C8A7A] hover:text-[#5F6F65] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7A6A] block mb-1.5">Describe your email</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          placeholder="e.g. Gallery delivery email for a wedding couple, excited tone, mention their sneak peek is included..."
          rows={3}
          className="w-full px-4 py-3 bg-white border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 resize-none leading-relaxed"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || loading}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#5F6F65] hover:bg-[#4A6657] text-white rounded-xl text-xs font-black transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {loading ? 'Drafting…' : 'Generate Draft'}
        <span className="opacity-60 font-normal">⌘↵</span>
      </button>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-bold text-rose-700">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {draft && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#E8E4E1] p-4 space-y-3">
            {parsed.subject && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] mb-1">Subject</p>
                <p className="text-sm font-bold text-[#2C2511]">{parsed.subject}</p>
              </div>
            )}
            {parsed.body && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] mb-1">Body</p>
                <pre className="text-sm text-[#332F2E] leading-relaxed whitespace-pre-wrap font-sans">{parsed.body}</pre>
              </div>
            )}
            {!parsed.subject && !parsed.body && (
              <pre className="text-sm text-[#332F2E] leading-relaxed whitespace-pre-wrap font-sans">{draft}</pre>
            )}
          </div>
          {(parsed.subject || parsed.body) && (
            <button
              onClick={() => onInsert({ subject: parsed.subject, body: parsed.body || draft })}
              className="w-full py-2.5 bg-[#5F6F65] hover:bg-[#4A6657] text-white rounded-xl text-xs font-black transition"
            >
              Use This Draft →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// --- Email Preview ---
const EmailPreview = ({ subject, body, onCopy, onSend, isSending, copyFlash }) => (
  <div className="bg-white rounded-2xl border border-[#E8E4E1] overflow-hidden">
    <div className="px-6 py-4 border-b border-[#F2EFE9] bg-[#FDFCFB] flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] mb-0.5">Subject</p>
        <p className="font-bold text-[#2C2511] text-sm">{subject || '—'}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            copyFlash
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-[#F2EFE9] hover:bg-[#E8E4E1] text-[#5F6F65]'
          }`}
        >
          {copyFlash ? <CheckCircle2 size={13} /> : <Copy size={13} />}
          {copyFlash ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={onSend} disabled={isSending}
          className="flex items-center gap-2 px-4 py-2 bg-[#5F6F65] hover:bg-[#4A6657] text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
        ><Send size={13} /> {isSending ? 'Sending…' : 'Send via Mail'}</button>
      </div>
    </div>
    <pre className="px-6 py-5 text-sm text-[#332F2E] leading-relaxed whitespace-pre-wrap font-sans min-h-[120px]">
      {body || 'Select a template above to see preview.'}
    </pre>
  </div>
);

// --- Main Email View ---
const EmailView = () => {
  const { state, updateState } = useAppState();
  const templates = state.emailTemplates || [];
  const apiKey = state.geminiKey || '';

  const selectedId = state.emailSelectedTemplateId || '';
  const setSelectedId = (id) => updateState({ emailSelectedTemplateId: id });
  const tokenValues = state.emailTokenValues || {};
  const setTokenValues = (updater) => {
    const next = typeof updater === 'function' ? updater(tokenValues) : updater;
    updateState({ emailTokenValues: next });
  };
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', subject: '', body: '' });
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [inboxTab, setInboxTab] = useState(false);
  const [inboxEmails, setInboxEmails] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedInboxEmail, setSelectedInboxEmail] = useState(null);
  const [copyFlash, setCopyFlash] = useState(false);

  const selectedTemplate = useMemo(() => templates.find(t => t.id === selectedId), [templates, selectedId]);
  const tokens = useMemo(() => selectedTemplate ? extractTokens(selectedTemplate.subject + '\n' + selectedTemplate.body) : [], [selectedTemplate]);

  const currentTokenValues = (selectedId && tokenValues[selectedId]) || {};
  const previewSubject = selectedTemplate ? renderTemplate(selectedTemplate.subject, currentTokenValues) : '';
  const previewBody = selectedTemplate ? renderTemplate(selectedTemplate.body, currentTokenValues) : '';

  useEffect(() => {
    if (editMode && selectedTemplate) {
      setEditForm({ name: selectedTemplate.name, subject: selectedTemplate.subject, body: selectedTemplate.body });
    } else if (editMode && !selectedTemplate) {
      setEditForm({ name: '', subject: '', body: '' });
    }
  }, [editMode, selectedTemplate]);

  const handleSaveTemplate = useCallback(() => {
    if (!editForm.name || !editForm.body) return;
    const isNew = !selectedId;
    const updated = isNew
      ? [...templates, { id: Date.now().toString(), ...editForm }]
      : templates.map(t => t.id === selectedId ? { ...t, ...editForm } : t);
    updateState({ emailTemplates: updated });
    if (isNew) setSelectedId(updated[updated.length - 1].id);
    setEditMode(false);
    setShowAiDraft(false);
    toast(isNew ? 'Template created' : 'Template updated');
  }, [editForm, selectedId, templates, updateState]);

  const handleDeleteTemplate = useCallback(() => {
    if (!selectedId || !window.confirm('Delete this template?')) return;
    updateState({ emailTemplates: templates.filter(t => t.id !== selectedId) });
    setSelectedId('');
    setEditMode(false);
  }, [selectedId, templates, updateState]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(previewBody);
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 2000);
  }, [previewBody]);

  const handleSend = useCallback(async () => {
    if (!previewBody) return;
    setIsSending(true);
    try {
      if (selectedInboxEmail && window.electronAPI?.sendEmail) {
        const sub = selectedInboxEmail.subject.toLowerCase().startsWith('re:')
          ? selectedInboxEmail.subject
          : `Re: ${selectedInboxEmail.subject}`;
        await window.electronAPI.sendEmail({ to: selectedInboxEmail.from, subject: sub, body: previewBody, creds: state.emailSettings });
      } else if (window.electronAPI?.openMailApp) {
        await window.electronAPI.openMailApp({ subject: previewSubject, body: previewBody });
      } else {
        const mailto = `mailto:?subject=${encodeURIComponent(previewSubject)}&body=${encodeURIComponent(previewBody)}`;
        window.open(mailto);
      }
    } catch (e) {
      console.error('Send failed:', e);
    } finally {
      setIsSending(false);
    }
  }, [previewBody, previewSubject, selectedInboxEmail, state.emailSettings]);

  const fetchInbox = useCallback(async () => {
    setIsFetching(true); setFetchError('');
    try {
      if (!window.electronAPI?.fetchInbox) { setFetchError('Gmail bridge not available.'); return; }
      const res = await window.electronAPI.fetchInbox(state.emailSettings);
      if (res.success) setInboxEmails(res.emails);
      else setFetchError(res.error || 'Failed to fetch inbox.');
    } catch (e) { setFetchError(e.message); }
    finally { setIsFetching(false); }
  }, [state.emailSettings]);

  const handleAiInsert = useCallback(({ subject, body }) => {
    setEditForm(f => ({ ...f, subject: subject || f.subject, body: body || f.body }));
    setShowAiDraft(false);
    toast('Draft inserted — review and save');
  }, []);

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header>
        <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <Mail size={14} /><span>Email Ops</span>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">Email Command</h2>
        <p className="text-[#8A7A6A] mt-2 text-lg">Compose, personalize, and send from your templates.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Template Picker + Token Inputs */}
        <div className="lg:col-span-1 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#8A7A6A]">Templates</h3>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedId(''); setEditMode(true); setShowAiDraft(false); }} className="p-1.5 rounded-lg text-[#9C8A7A] hover:text-[#5F6F65] hover:bg-[#F2EFE9] transition" title="New Template"><Plus size={15} /></button>
                {selectedId && <button onClick={() => setEditMode(v => !v)} className={`p-1.5 rounded-lg transition ${editMode ? 'text-[#5F6F65] bg-[#EEF2F0]' : 'text-[#9C8A7A] hover:text-[#5F6F65] hover:bg-[#F2EFE9]'}`} title="Edit Template"><Edit3 size={15} /></button>}
                {selectedId && <button onClick={handleDeleteTemplate} className="p-1.5 rounded-lg text-[#9C8A7A] hover:text-rose-500 hover:bg-rose-50 transition" title="Delete Template"><Trash2 size={15} /></button>}
              </div>
            </div>
            <div className="space-y-1">
              {templates.map(t => (
                <button key={t.id} onClick={() => { setSelectedId(t.id); setEditMode(false); setShowAiDraft(false); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${
                    selectedId === t.id ? 'bg-[#EEF2F0] text-[#5F6F65]' : 'text-[#8A7A6A] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {t.name}
                  {selectedId === t.id && <ChevronRight size={14} />}
                </button>
              ))}
              {templates.length === 0 && (
                <div className="mt-2 py-8 px-4 bg-[#FAF8F3] rounded-2xl border border-dashed border-[#D8D0C0] text-center">
                  <FileEdit size={24} className="text-[#C8C0B8] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#9C8A7A]">No templates yet</p>
                  <p className="text-xs text-[#B0A090] mt-1">Click + above to create one</p>
                </div>
              )}
            </div>
          </div>

          {/* Token inputs */}
          {selectedTemplate && !editMode && tokens.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#8A7A6A]">Fill In Details</h3>
                {Object.values(currentTokenValues).some(v => v) && (
                  <button
                    onClick={() => setTokenValues(v => ({ ...v, [selectedId]: {} }))}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#9C8A7A] hover:text-rose-500 transition-colors"
                  >
                    <X size={11} />
                    Clear
                  </button>
                )}
              </div>
              {tokens.map(token => (
                <div key={token}>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] block mb-1">{token}</label>
                  <input
                    value={currentTokenValues[token] || ''}
                    onChange={e => setTokenValues(v => ({ ...v, [selectedId]: { ...v[selectedId], [token]: e.target.value } }))}
                    placeholder={`Value for ${token}...`}
                    className="w-full px-3 py-2.5 bg-white border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Editor OR Preview */}
        <div className="lg:col-span-2 space-y-5">
          {editMode ? (
            <div className="bg-white rounded-2xl border border-[#E8E4E1] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black flex items-center gap-2 text-[#2C2511]"><FileEdit size={16} className="text-[#5F6F65]" /> {selectedId ? 'Edit Template' : 'New Template'}</h3>
                <button
                  onClick={() => setShowAiDraft(v => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    showAiDraft ? 'bg-[#5F6F65] text-white' : 'bg-gradient-to-r from-[#EEF2F0] to-[#F2EFE9] text-[#5F6F65] hover:from-[#D8E4DC] hover:to-[#E8E4E1]'
                  }`}
                >
                  <Sparkles size={13} />
                  {showAiDraft ? 'Hide AI Draft' : 'AI Draft'}
                </button>
              </div>

              {/* AI Draft Panel */}
              {showAiDraft && (
                <AiDraftPanel
                  apiKey={apiKey}
                  onInsert={handleAiInsert}
                  onClose={() => setShowAiDraft(false)}
                />
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7A6A] block mb-1.5">Template Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Gallery Delivery"
                  className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7A6A] block mb-1.5">Subject Line <span className="normal-case font-normal">(use {`{{Token}}`} for variables)</span></label>
                <input value={editForm.subject} onChange={e => setEditForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Your Gallery is Live! {{ClientName}}"
                  className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7A6A] block mb-1.5">Body</label>
                <textarea value={editForm.body} onChange={e => setEditForm(f => ({...f, body: e.target.value}))} rows={8} placeholder="Hi {{ClientName}}, ..."
                  className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 resize-y leading-relaxed"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveTemplate} className="flex-1 py-3 bg-[#5F6F65] hover:bg-[#4A6657] text-white rounded-xl font-bold text-sm transition">Save Template</button>
                <button onClick={() => { setEditMode(false); setShowAiDraft(false); }} className="px-5 py-3 bg-[#F2EFE9] hover:bg-[#E8E4E1] text-[#5F6F65] rounded-xl font-bold text-sm transition">Cancel</button>
              </div>
            </div>
          ) : (
            <EmailPreview subject={previewSubject} body={previewBody} onCopy={handleCopy} onSend={handleSend} isSending={isSending} copyFlash={copyFlash} />
          )}

          {/* Gmail Inbox Panel */}
          <div>
            <button onClick={() => setInboxTab(v => !v)} className="flex items-center gap-2 text-sm font-bold text-[#5F6F65] hover:text-[#4A6657] mb-3">
              <Inbox size={16} /> {inboxTab ? 'Hide' : 'Show'} Gmail Inbox
            </button>
            {inboxTab && (
              <div className="bg-white rounded-2xl border border-[#E8E4E1] p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-black uppercase tracking-wider text-[#8A7A6A]">Recent Threads</p>
                  <button onClick={fetchInbox} disabled={isFetching} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2F0] text-[#5F6F65] rounded-lg text-xs font-bold hover:bg-[#D8E4DC] transition disabled:opacity-60">
                    <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Sync
                  </button>
                </div>
                {fetchError && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
                    <AlertCircle size={14} className="text-rose-500 shrink-0" />
                    <p className="text-xs font-bold text-rose-700">{fetchError}</p>
                  </div>
                )}
                {inboxEmails.length === 0
                  ? <p className="text-xs text-[#9C8A7A] italic text-center py-4">Click Sync to load your Gmail inbox.<br/>Configure credentials in Settings.</p>
                  : <div className="space-y-2 max-h-60 overflow-y-auto">
                    {inboxEmails.map((email, i) => (
                      <button key={i} onClick={() => setSelectedInboxEmail(email === selectedInboxEmail ? null : email)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${selectedInboxEmail === email ? 'bg-[#EEF2F0] border-[#5F6F65]/30' : 'bg-[#FAF8F3] border-[#E8E4E1] hover:bg-[#F2EFE9]'}`}
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <p className="font-bold text-xs text-[#2C2511] truncate pr-2 max-w-[70%]">{email.from}</p>
                          <span className="text-[9px] text-[#9C8A7A]">{new Date(email.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-[#5C4A3A] truncate">{email.subject}</p>
                      </button>
                    ))}
                  </div>
                }
                {selectedInboxEmail && (
                  <div className="mt-3 pt-3 border-t border-[#F2EFE9]">
                    <p className="text-[10px] font-bold text-[#5F6F65]">Replying to: {selectedInboxEmail.from}</p>
                    <p className="text-[10px] text-[#9C8A7A] mt-0.5">Template will be sent as a reply thread. Subject locked to "Re: {selectedInboxEmail.subject}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailView;
