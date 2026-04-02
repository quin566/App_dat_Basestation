import React, { useState } from 'react';
import { CheckCircle2, Circle, Info, ChevronUp } from 'lucide-react';

const ChecklistItem = ({ id, text, sub, done, onToggle, detailedGuide }) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className={`rounded-2xl border transition-all ${done ? 'bg-[#F0F4F1] border-[#C8D8CC]' : 'bg-white border-[#E8E4E1] hover:bg-[#FAF8F3]'}`}>
      <div className="flex items-start gap-4 p-5">
        <button
          onClick={() => onToggle(id, !done)}
          className={`mt-0.5 flex-shrink-0 transition-colors ${done ? 'text-[#5F6F65]' : 'text-[#C8C0B8] hover:text-[#5F6F65]'}`}
        >
          {done ? <CheckCircle2 size={20} strokeWidth={2} /> : <Circle size={20} strokeWidth={2} />}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggle(id, !done)}>
          <p className={`text-sm font-bold leading-snug ${done ? 'line-through text-[#9C8A7A]' : 'text-[#2C2511]'}`}>
            {text}
          </p>
          {sub && <p className="text-[11px] text-[#9C8A7A] mt-1 leading-relaxed">{sub}</p>}
        </div>
        {detailedGuide && (
          <button
            onClick={() => setShowGuide(v => !v)}
            className={`flex-shrink-0 transition-colors mt-0.5 ${showGuide ? 'text-[#5F6F65]' : 'text-[#B0A090] hover:text-[#5F6F65]'}`}
            title="How to do this"
          >
            {showGuide ? <ChevronUp size={16} /> : <Info size={16} />}
          </button>
        )}
      </div>
      {showGuide && detailedGuide && (
        <div className="px-5 pb-5 -mt-1 ml-9">
          <div className="bg-[#F7F4EF] border border-[#E0DAD3] rounded-xl p-4 text-xs text-[#5C4E3A] leading-relaxed font-medium whitespace-pre-line">
            {detailedGuide}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistItem;
