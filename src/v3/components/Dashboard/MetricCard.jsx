import React from 'react';
import { formatCurrency } from '../../utils/taxEngine';

const MetricCard = ({ title, value, subtext, icon: Icon, trend, accent = 'sage', onClick }) => {
  const accentColors = {
    sage: 'bg-[#5F6F65] text-white',
    linen: 'bg-[#F2EFE9] text-[#332F2E]',
    amber: 'bg-[#D4A373] text-white',
    charcoal: 'bg-[#332F2E] text-white'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-3xl p-8 border border-[#E8E4E1] shadow-sm transition-all group relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.99]' : 'hover:shadow-md'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${accentColors[accent] || accentColors.sage} shadow-sm transition-transform group-hover:scale-110`}>
          {Icon && <Icon size={24} />}
        </div>
        {trend && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {trend.value}
          </span>
        )}
      </div>
      
      <h3 className="text-[#8A7A6A] text-sm font-bold uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-[#2C2511]">
          {typeof value === 'number' ? formatCurrency(value) : value}
        </span>
      </div>
      
      {subtext && (
        <p className="mt-4 text-xs text-[#9C8A7A] leading-relaxed">
          {subtext}
        </p>
      )}
      
      {/* Subtle background decoration */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#FAF8F3] rounded-full opacity-50 group-hover:scale-125 transition-transform" />
    </div>
  );
};

export default MetricCard;
