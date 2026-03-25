import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getColors } from '../../utils/sessionColors';
import ClientCard from './ClientCard';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarGrid = ({ year, month, clients, selectedDate, onSelectDate, onSelectClient, direction }) => {
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const clientsByDate = {};
  clients.forEach(c => {
    if (!c.shootDate) return;
    const [cy, cm, cd] = c.shootDate.split('-').map(Number);
    if (cy === year && cm - 1 === month) {
      const key = cd;
      if (!clientsByDate[key]) clientsByDate[key] = [];
      clientsByDate[key].push(c);
    }
  });

  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (d) => {
    if (!selectedDate) return false;
    const [sy, sm, sd] = selectedDate.split('-').map(Number);
    return sd === d && sm - 1 === month && sy === year;
  };

  const dateStr = (d) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Animated month grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${year}-${month}`}
          initial={{ x: direction * 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction * -60, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-1 grid grid-cols-7 gap-px bg-[#E8E4E1]"
        >
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              const dayClients = day ? (clientsByDate[day] || []) : [];
              const selected = day && isSelected(day);
              const todayCell = day && isToday(day);

              return (
                <div
                  key={`${wi}-${di}`}
                  onClick={() => day && onSelectDate(dateStr(day))}
                  className={`bg-white p-1.5 min-h-[80px] flex flex-col gap-1 cursor-pointer transition-colors ${
                    selected ? 'bg-[#EEF2EE]' : 'hover:bg-[#FDFCFB]'
                  } ${!day ? 'cursor-default bg-[#FAFAF8]' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full self-end ${
                        todayCell
                          ? 'bg-[#5F6F65] text-white'
                          : selected
                          ? 'text-[#5F6F65]'
                          : 'text-[#6A5A4A]'
                      }`}>
                        {day}
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1">
                        {dayClients.slice(0, 2).map(c => (
                          <ClientCard
                            key={c.id}
                            client={c}
                            onClick={(e) => { e.stopPropagation(); onSelectClient(c); }}
                          />
                        ))}
                        {dayClients.length > 2 && (
                          <div className="text-[9px] font-black text-[#9C8A7A] px-1">
                            +{dayClients.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CalendarGrid;
