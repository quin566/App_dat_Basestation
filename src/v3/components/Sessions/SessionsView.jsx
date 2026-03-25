import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';
import { emptyClient } from '../../utils/initialState';
import { getColors } from '../../utils/sessionColors';
import CalendarGrid from './CalendarGrid';
import DayTimeline from './DayTimeline';
import ClientProfileModal from './ClientProfileModal';
import PixisetImport from './PixisetImport';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const MiniCalendar = ({ year, month, clients, selectedDate, onSelectDate }) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const clientDates = new Set(
    clients
      .filter(c => {
        if (!c.shootDate) return false;
        const [cy, cm] = c.shootDate.split('-').map(Number);
        return cy === year && cm - 1 === month;
      })
      .map(c => parseInt(c.shootDate.split('-')[2]))
  );

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (d) => selectedDate === dateStr(d);

  return (
    <div className="text-center">
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[9px] font-black text-[#C0B0A0] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <button
            key={i}
            disabled={!day}
            onClick={() => day && onSelectDate(dateStr(day))}
            className={`w-7 h-7 mx-auto text-[11px] font-bold rounded-full flex items-center justify-center relative transition-colors ${
              !day ? 'cursor-default' :
              isSelected(day) ? 'bg-[#5F6F65] text-white' :
              isToday(day) ? 'text-[#5F6F65] font-black underline' :
              'text-[#6A5A4A] hover:bg-[#F2EFE9]'
            }`}
          >
            {day}
            {day && clientDates.has(day) && !isSelected(day) && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#7A8C6E]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const SessionsView = () => {
  const { state, updateState } = useAppState();
  const clients = state.bookedClients || [];

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [direction, setDirection] = useState(1);
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  );
  const [selectedClient, setSelectedClient] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const prevMonth = () => {
    setDirection(-1);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    setDirection(1);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleAddClient = () => {
    const newClient = {
      ...emptyClient,
      id: crypto.randomUUID(),
      shootDate: selectedDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateState({ bookedClients: [...clients, newClient] });
    setSelectedClient(newClient);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-1">
              <span>Sessions</span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-black text-[#2C2511] tracking-tight">
                {MONTHS[month]} {year}
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65] hover:bg-[#E8E4E1] transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65] hover:bg-[#E8E4E1] transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F2EFE9] hover:bg-[#E8E4E1] text-[#5F6F65] text-sm font-black rounded-xl transition-colors"
            >
              <Upload size={15} /> Import CSV
            </button>
            <button
              onClick={handleAddClient}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#5F6F65] hover:bg-[#4A6657] text-white text-sm font-black rounded-xl transition-colors"
            >
              <Plus size={15} /> New Client
            </button>
          </div>
        </div>

        {/* Empty state banner */}
        {clients.length === 0 && (
          <div className="p-4 bg-[#F8F4EE] border border-[#D4C4A8] rounded-2xl flex items-center gap-4">
            <Upload size={20} className="text-[#9C8A7A] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-[#5F6F65]">No clients yet</div>
              <div className="text-xs text-[#9C8A7A] mt-0.5">Import your Pixiset client list or add clients manually.</div>
            </div>
            <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-[#5F6F65] text-white text-xs font-black rounded-xl hover:bg-[#4A6657] transition-colors flex-shrink-0">
              Import CSV
            </button>
          </div>
        )}

        {/* Calendar grid */}
        <div className="flex-1 overflow-hidden">
          <CalendarGrid
            year={year}
            month={month}
            clients={clients}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectClient={setSelectedClient}
            direction={direction}
          />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-80 border-l border-[#E8E4E1] bg-white flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#E8E4E1]">
          {/* Mini calendar header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-black uppercase tracking-widest text-[#9C8A7A]">
              {MONTHS[month]} {year}
            </div>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="w-6 h-6 rounded-lg bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65] hover:bg-[#E8E4E1] transition-colors">
                <ChevronLeft size={12} />
              </button>
              <button onClick={nextMonth} className="w-6 h-6 rounded-lg bg-[#F2EFE9] flex items-center justify-center text-[#5F6F65] hover:bg-[#E8E4E1] transition-colors">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
          <MiniCalendar
            year={year}
            month={month}
            clients={clients}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        <div className="flex-1 p-5 overflow-hidden flex flex-col">
          <DayTimeline
            date={selectedDate}
            clients={clients}
            onSelectClient={setSelectedClient}
          />
        </div>
      </aside>

      {/* Client Profile Modal */}
      {selectedClient && (
        <ClientProfileModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* Pixiset Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-6" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <PixisetImport onClose={() => setShowImport(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsView;
