import React, { useState, useMemo } from 'react';
import { useAppState } from '../../contexts/StateContext';
import { Users, Plus, Trash2, Clock, CheckCircle2, CalendarDays, AlertCircle } from 'lucide-react';
import { toast } from '../Toast';

// --- Lead Card ---
const LeadCard = ({ lead, onDelete }) => {
  const hoursPassed = (Date.now() - lead.logDate) / (1000 * 60 * 60);
  const remaining = Math.max(0, 48 - hoursPassed);
  const isUrgent = remaining <= 12;

  return (
    <div className={`relative group flex flex-col gap-2 p-5 rounded-2xl border transition-all ${
      isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-[#FAF8F3] border-[#E8E4E1]'
    }`}>
      <button
        onClick={() => onDelete(lead.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-[#C8C0B8] hover:text-rose-500"
      >
        <Trash2 size={14} />
      </button>
      <div className="flex items-start justify-between pr-5">
        <div>
          <p className="font-black text-sm text-[#2C2511]">{lead.name}</p>
          <p className="text-xs text-[#9C8A7A] mt-0.5">{lead.type}</p>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black rounded-full px-2.5 py-1 ${
          isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-[#EEF2F0] text-[#5F6F65]'
        }`}>
          <Clock size={11} />
          {remaining.toFixed(0)}h left
        </div>
      </div>
      {isUrgent && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600">
          <AlertCircle size={12} /> Follow up before response window closes!
        </div>
      )}
    </div>
  );
};

// --- Booking Card ---
const BookingCard = ({ client, onToggleRetainer, onToggleBalance, onDelete }) => {
  const retainer = client.pkgPrice * 0.5;
  const balance = client.pkgPrice - retainer;
  const fullyPaid = client.retainerPaid && client.balancePaid;

  return (
    <div className={`relative group rounded-2xl border p-6 transition-all ${
      fullyPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#E8E4E1]'
    }`}>
      <button
        onClick={() => onDelete(client.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-[#C8C0B8] hover:text-rose-500"
      >
        <Trash2 size={14} />
      </button>
      <div className="flex items-start justify-between mb-4 pr-6">
        <div>
          <p className="font-black text-[#2C2511]">{client.name}</p>
          {fullyPaid && <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5 mt-1 inline-block">Fully Paid ✓</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#8A7A6A] font-bold">
          <CalendarDays size={12} />
          {client.shootDate}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onToggleRetainer(client.id)}
          className={`flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${
            client.retainerPaid
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-[#FAF8F3] border-[#E8E4E1] hover:border-[#5F6F65]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#8A7A6A]">50% Retainer</span>
            <CheckCircle2 size={14} className={client.retainerPaid ? 'text-emerald-600' : 'text-[#C8C0B8]'} />
          </div>
          <span className={`font-black text-base ${client.retainerPaid ? 'text-emerald-700' : 'text-[#332F2E]'}`}>
            ${retainer.toLocaleString()}
          </span>
        </button>
        <button
          onClick={() => onToggleBalance(client.id)}
          className={`flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${
            client.balancePaid
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-[#FAF8F3] border-[#E8E4E1] hover:border-[#5F6F65]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#8A7A6A]">Final Balance</span>
            <CheckCircle2 size={14} className={client.balancePaid ? 'text-emerald-600' : 'text-[#C8C0B8]'} />
          </div>
          <span className={`font-black text-base ${client.balancePaid ? 'text-emerald-700' : 'text-[#332F2E]'}`}>
            ${balance.toLocaleString()}
          </span>
        </button>
      </div>
    </div>
  );
};

// --- Main CRM View ---
const CRMView = () => {
  const { state, updateState } = useAppState();
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadType, setNewLeadType] = useState('');
  const [leadError, setLeadError] = useState('');
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({ name: '', pkgPrice: '', shootDate: '' });

  const leads = state.crmLeads || [];
  const clients = useMemo(() => [...(state.bookedClients || [])].sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate)), [state.bookedClients]);

  const addLead = () => {
    if (!newLeadName.trim()) {
      setLeadError('Please enter a client name.');
      return;
    }
    setLeadError('');
    updateState({ crmLeads: [...leads, { id: Date.now().toString(), name: newLeadName.trim(), type: newLeadType.trim() || 'General Inquiry', logDate: Date.now() }] });
    setNewLeadName('');
    setNewLeadType('');
    toast('Inquiry added');
  };

  const deleteLead = (id) => updateState({ crmLeads: leads.filter(l => l.id !== id) });

  const addBooking = () => {
    if (!bookingForm.name || !bookingForm.pkgPrice || !bookingForm.shootDate) return;
    const newClient = { id: Date.now().toString(), name: bookingForm.name, pkgPrice: parseFloat(bookingForm.pkgPrice), retainerPaid: false, balancePaid: false, shootDate: bookingForm.shootDate };
    updateState({ bookedClients: [...(state.bookedClients || []), newClient] });
    setBookingForm({ name: '', pkgPrice: '', shootDate: '' });
    setShowAddBooking(false);
    toast('Booking saved');
  };

  const updateClient = (id, patch) => {
    const updated = (state.bookedClients || []).map(c => c.id === id ? { ...c, ...patch } : c);
    updateState({ bookedClients: updated });
  };

  const deleteClient = (id) => updateState({ bookedClients: (state.bookedClients || []).filter(c => c.id !== id) });

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <div className="flex items-center gap-3 text-[#9C8A7A] text-sm font-bold uppercase tracking-widest mb-2">
          <Users size={14} /> <span>CRM / Leads</span>
        </div>
        <h2 className="text-5xl font-black text-[#2C2511] tracking-tight">Your Pipeline</h2>
        <p className="text-[#8A7A6A] mt-2 text-lg">Track inquiries and manage booked clients.</p>
      </header>

      {/* Active Inquiries */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black flex items-center gap-3">
            <div className="w-1.5 h-5 bg-amber-400 rounded-full" />
            Active Inquiries
            {leads.length > 0 && <span className="text-sm font-black text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">{leads.length}</span>}
          </h3>
        </div>

        <div className="flex gap-3 mb-1.5 items-end">
          <div className="flex-1">
            <label htmlFor="lead-name" className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] block mb-1.5">Client Name *</label>
            <input
              id="lead-name"
              value={newLeadName}
              onChange={e => { setNewLeadName(e.target.value); if (leadError) setLeadError(''); }}
              onKeyDown={e => e.key === 'Enter' && addLead()}
              placeholder="e.g. Sarah & James"
              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 transition ${
                leadError ? 'border-rose-300 bg-rose-50' : 'border-[#E8E4E1]'
              }`}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="lead-type" className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] block mb-1.5">Shoot Type</label>
            <input
              id="lead-type"
              value={newLeadType}
              onChange={e => setNewLeadType(e.target.value)}
              placeholder="e.g. Wedding"
              className="w-full px-4 py-3 bg-white border border-[#E8E4E1] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
            />
          </div>
          <button onClick={addLead} className="flex items-center gap-2 px-5 py-3 bg-[#5F6F65] hover:bg-[#4A6657] text-white rounded-xl text-sm font-bold transition-colors">
            <Plus size={16} /> Add
          </button>
        </div>

        {leadError && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-rose-600 mb-4">
            <AlertCircle size={12} /> {leadError}
          </p>
        )}

        <div className="mt-5">
          {leads.length === 0
            ? <div className="py-10 text-center bg-[#FAF8F3] rounded-2xl border border-dashed border-[#D8D0C0] text-[#9C8A7A] text-sm italic">Inbox zero! No active inquiries.</div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{leads.map(l => <LeadCard key={l.id} lead={l} onDelete={deleteLead} />)}</div>
          }
        </div>
      </section>

      {/* Booked Clients */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black flex items-center gap-3">
            <div className="w-1.5 h-5 bg-[#5F6F65] rounded-full" />
            Booked Clients
            {clients.length > 0 && <span className="text-sm font-black text-[#5F6F65] bg-[#EEF2F0] rounded-full px-2 py-0.5">{clients.length}</span>}
          </h3>
          <button onClick={() => setShowAddBooking(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-[#F2EFE9] hover:bg-[#E8E4E1] text-[#5F6F65] rounded-xl text-sm font-bold transition-colors">
            <Plus size={14} /> New Booking
          </button>
        </div>

        {showAddBooking && (
          <div className="mb-5 p-6 bg-white border border-[#E8E4E1] rounded-2xl space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="booking-name" className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] block mb-1.5">Client Name *</label>
                <input
                  id="booking-name"
                  value={bookingForm.name}
                  onChange={e => setBookingForm(f => ({...f, name: e.target.value}))}
                  placeholder="e.g. Emily & Cole"
                  className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                />
              </div>
              <div>
                <label htmlFor="booking-price" className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] block mb-1.5">Package Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8A7A] font-bold">$</span>
                  <input
                    id="booking-price"
                    type="number"
                    value={bookingForm.pkgPrice}
                    onChange={e => setBookingForm(f => ({...f, pkgPrice: e.target.value}))}
                    placeholder="3500"
                    className="w-full pl-7 pr-3 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="booking-date" className="text-[10px] font-black uppercase tracking-wider text-[#9C8A7A] block mb-1.5">Shoot Date *</label>
                <input
                  id="booking-date"
                  type="date"
                  value={bookingForm.shootDate}
                  onChange={e => setBookingForm(f => ({...f, shootDate: e.target.value}))}
                  className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                />
              </div>
            </div>
            <button onClick={addBooking} className="w-full py-3 bg-[#5F6F65] hover:bg-[#4A6657] text-white rounded-xl text-sm font-bold transition-colors">Save Booking</button>
          </div>
        )}

        {clients.length === 0
          ? <div className="py-10 text-center bg-[#FAF8F3] rounded-2xl border border-dashed border-[#D8D0C0] text-[#9C8A7A] text-sm italic">No active bookings yet.</div>
          : <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {clients.map(c => (
                <BookingCard key={c.id} client={c}
                  onToggleRetainer={(id) => updateClient(id, { retainerPaid: !c.retainerPaid })}
                  onToggleBalance={(id) => updateClient(id, { balancePaid: !c.balancePaid })}
                  onDelete={deleteClient}
                />
              ))}
            </div>
        }
      </section>
    </div>
  );
};

export default CRMView;
