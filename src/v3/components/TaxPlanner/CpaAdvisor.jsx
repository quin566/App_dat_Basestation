import React, { useState } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { formatCurrency } from '../../utils/taxEngine';
import { Send, Loader2, AlertTriangle, Bot } from 'lucide-react';

const CpaAdvisor = ({ gross, expenses, finances }) => {
  const { state } = useAppState();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiKey = state.geminiKey || '';
  const currentYear = new Date().getFullYear();

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    if (!apiKey) {
      setError('Add your Google Gemini API key in Settings → AI Advisor to use this feature.');
      return;
    }

    setLoading(true);
    setError('');
    setAnswer('');

    const netProfit = gross - expenses;

    const systemText = `You are a highly accurate CPA advisor for a sole proprietor photography business. You give precise, actionable tax advice based on current IRS rules and the user's real financial data.

Business context:
- Owner: Ariana
- Business: The Love Lens by Ariana (AZ Photo) — photography LLC
- State: Arizona (2.5% flat income tax)
- Entity type: Sole proprietor / single-member LLC (Schedule C filer)
- Tax year: ${currentYear}

Current financials:
- Gross Revenue: ${formatCurrency(gross)}
- Business Expenses: ${formatCurrency(expenses)}
- Net Profit (Schedule C): ${formatCurrency(netProfit)}
- Self-Employment Tax (15.3%): ${formatCurrency(finances.seTax)}
- SE Tax Deduction (½): ${formatCurrency(finances.seTax / 2)}
- QBI Deduction (20%): ${formatCurrency(finances.qbiDeduct)}
- Estimated Federal Tax: ${formatCurrency(finances.federalTax)}
- Arizona State Tax: ${formatCurrency(finances.azTax)}
- Total Estimated Tax: ${formatCurrency(finances.totalTax)}
- Marginal Federal Rate: ${Math.round(finances.marginalRate * 100)}%
- Estimated Take-Home: ${formatCurrency(finances.takehome)}

Instructions:
- Give direct, accurate answers grounded in current tax law
- When relevant, reference the specific IRS form, publication, or schedule
- Flag if a question requires a licensed CPA for the user's specific situation
- Keep answers concise but complete — no fluff
- Use plain language Ariana can act on`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemText }] },
            contents: [{ role: 'user', parts: [{ text: question.trim() }] }],
            generationConfig: { maxOutputTokens: 1024 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              accumulated += text;
              setAnswer(accumulated);
            }
          } catch { /* malformed SSE chunk, skip */ }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key in Settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm">
      <h3 className="text-lg font-black mb-2 flex items-center gap-3">
        <div className="w-1.5 h-5 bg-[#7B9EA8] rounded-full" />
        Virtual CPA Advisor
      </h3>
      <p className="text-xs text-[#9C8A7A] mb-6">
        Ask any tax question — answered with your real financials as context.
      </p>

      {!apiKey && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-700">
          <AlertTriangle size={15} className="shrink-0" />
          No API key configured. Add your free Gemini API key in Settings → AI Advisor.
        </div>
      )}

      <div className="space-y-4">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk(); }}
          placeholder="e.g. Can I deduct my camera lens as a §179 expense this year?"
          rows={3}
          className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-2xl text-sm font-medium text-[#2C2511] placeholder:text-[#C4B9B0] focus:outline-none focus:ring-2 focus:ring-[#7B9EA8]/40 resize-none"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleAsk}
            disabled={!question.trim() || loading || !apiKey}
            className="flex items-center gap-2 px-6 py-3 bg-[#5F6F65] hover:bg-[#4A6657] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all active:scale-95"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {loading ? 'Thinking…' : 'Ask CPA'}
          </button>
          <span className="text-[10px] text-[#B0A090] font-medium">⌘↵ to submit</span>
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-6 p-5 bg-[#F8F6F2] border border-[#E8E4E1] rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={14} className="text-[#7B9EA8]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#7B9EA8]">CPA Advisor</span>
          </div>
          <p className="text-sm text-[#2C2511] leading-relaxed whitespace-pre-wrap font-medium">{answer}</p>
          <p className="mt-4 text-[10px] text-[#B0A090] font-medium italic">
            Not a substitute for a licensed CPA. For complex situations, consult a tax professional.
          </p>
        </div>
      )}
    </div>
  );
};

export default CpaAdvisor;
