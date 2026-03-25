import React from 'react';
import { getColors } from '../../utils/sessionColors';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

const fmt12 = (h) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12} ${ampm}`;
};

const DayTimeline = ({ date, clients, onSelectClient }) => {
  const dayClients = clients
    .filter(c => c.shootDate === date)
    .sort((a, b) => (a.shootTime || '').localeCompare(b.shootTime || ''));

  const parsedLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-black uppercase tracking-widest text-[#9C8A7A] mb-3 px-1">
        {parsedLabel || 'Select a day'}
      </div>

      {!date && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#C0B0A0] font-medium text-center px-4">Click a date on the calendar to see sessions</p>
        </div>
      )}

      {date && dayClients.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#C0B0A0] font-medium text-center px-4">No sessions this day</p>
        </div>
      )}

      {date && dayClients.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {dayClients.map(client => {
            const colors = getColors(client.shootType);
            const unpaid = client.packageTotal - client.amountPaid;
            return (
              <button
                key={client.id}
                onClick={() => onSelectClient(client)}
                className={`w-full text-left p-3 rounded-xl border cursor-pointer transition-opacity hover:opacity-80 ${colors.bg} ${colors.border}`}
              >
                <div className={`text-sm font-black ${colors.text}`}>{client.name}</div>
                <div className="text-xs text-[#8A7A6A] font-medium mt-0.5">
                  {client.shootTime || '—'}{client.duration ? ` · ${client.duration}` : ''}
                </div>
                {client.location?.name && (
                  <div className="text-[11px] text-[#9C8A7A] mt-0.5 truncate">{client.location.name}</div>
                )}
                {unpaid > 0 && (
                  <div className="text-[11px] font-black text-amber-600 mt-1">${unpaid.toFixed(2)} balance due</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DayTimeline;
