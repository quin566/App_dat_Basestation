import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const ChecklistItem = ({ id, text, sub, done, onToggle }) => {
  return (
    <label
      className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all border ${
        done
          ? 'bg-[#F0F4F1] border-[#C8D8CC]'
          : 'bg-white border-[#E8E4E1] hover:bg-[#FAF8F3]'
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 transition-colors ${done ? 'text-[#5F6F65]' : 'text-[#C8C0B8]'}`}>
        {done ? <CheckCircle2 size={20} strokeWidth={2} /> : <Circle size={20} strokeWidth={2} />}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-bold leading-snug ${done ? 'line-through text-[#9C8A7A]' : 'text-[#2C2511]'}`}>
          {text}
        </p>
        {sub && <p className="text-[11px] text-[#9C8A7A] mt-1 leading-relaxed">{sub}</p>}
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={done}
        onChange={(e) => onToggle(id, e.target.checked)}
      />
    </label>
  );
};

export default ChecklistItem;
