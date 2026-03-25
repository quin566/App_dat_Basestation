import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Upload } from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';
import InspirationBoard from './InspirationBoard';
import SmsLogPanel from './SmsLogPanel';

const TABS = ['Overview', 'Inspiration', 'Emails', 'Documents', 'SMS Log', 'Notes'];

const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
    />
  </div>
);

const ClientProfileModal = ({ client, onClose }) => {
  const { state, updateState } = useAppState();
  const [activeTab, setActiveTab] = useState('Overview');
  const [local, setLocal] = useState({ ...client });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [documents, setDocuments] = useState([]);

  // Sync if client prop changes (e.g. from parent state update)
  useEffect(() => { setLocal({ ...client }); }, [client.id]);

  const saveField = (key, value) => {
    const updated = { ...local, [key]: value, updatedAt: new Date().toISOString() };
    setLocal(updated);
    persistClient(updated);
  };

  const saveLocationField = (key, value) => {
    const updated = {
      ...local,
      location: { ...local.location, [key]: value },
      updatedAt: new Date().toISOString(),
    };
    setLocal(updated);
    persistClient(updated);
  };

  const persistClient = (updated) => {
    const clients = state.bookedClients.map(c => c.id === updated.id ? updated : c);
    updateState({ bookedClients: clients });
  };

  const handleClientUpdate = (updated) => {
    setLocal(updated);
    persistClient(updated);
  };

  const handleDelete = async () => {
    if (window.electronAPI) {
      await window.electronAPI.clientDeleteFolder({ clientId: client.id });
    }
    updateState({ bookedClients: state.bookedClients.filter(c => c.id !== client.id) });
    onClose();
  };

  const handleDocUpload = async () => {
    if (!window.electronAPI) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const buffer = Array.from(new Uint8Array(ev.target.result));
        const filename = `doc_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const res = await window.electronAPI.clientSaveFile({ clientId: client.id, filename, buffer });
        if (res?.success) {
          setDocuments(prev => [...prev, { filename, label: file.name, addedAt: new Date().toISOString() }]);
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  const handleDocDelete = async (filename) => {
    await window.electronAPI?.clientDeleteFile?.({ clientId: client.id, filename });
    setDocuments(prev => prev.filter(d => d.filename !== filename));
  };

  // Email threading
  const clientEmails = (state.emails || [])
    .filter(e => e.fromEmail === client.email || e.toEmail === client.email)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const unpaid = local.packageTotal - local.amountPaid;

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        className="fixed inset-0 bg-black/30 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="modal-panel"
        className="fixed top-0 right-0 bottom-0 w-[600px] max-w-full bg-white z-50 shadow-2xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E8E4E1]">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-2xl font-black text-[#2C2511] truncate">{local.name || 'Unnamed Client'}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {local.shootType && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#EEF2EE] text-[#5F6F65] rounded-full">
                  {local.shootType}
                </span>
              )}
              {local.shootDate && (
                <span className="text-xs font-bold text-[#8A7A6A]">
                  {new Date(local.shootDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {unpaid > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full">
                  ${unpaid.toFixed(2)} due
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#6A5A4A] hover:bg-[#E8E4E1] transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 overflow-x-auto border-b border-[#E8E4E1]">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-black whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-[#5F6F65] border-[#5F6F65]'
                  : 'text-[#9C8A7A] border-transparent hover:text-[#5F6F65]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'Overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name" value={local.name} onChange={v => saveField('name', v)} />
                <Field label="Phone (E.164)" value={local.phone} onChange={v => saveField('phone', v)} placeholder="+16025551234" />
                <Field label="Email" value={local.email} onChange={v => saveField('email', v)} type="email" />
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1">Shoot Type</label>
                  <select
                    value={local.shootType || ''}
                    onChange={e => saveField('shootType', e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
                  >
                    <option value="">Select…</option>
                    <option value="wedding">Wedding</option>
                    <option value="engagement">Engagement</option>
                    <option value="family">Family</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Field label="Shoot Date" value={local.shootDate} onChange={v => saveField('shootDate', v)} type="date" />
                <Field label="Shoot Time" value={local.shootTime} onChange={v => saveField('shootTime', v)} type="time" />
                <Field label="Duration" value={local.duration} onChange={v => saveField('duration', v)} placeholder="2 hours" />
              </div>

              <div className="border-t border-[#F2EFE9] pt-4 space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-[#9C8A7A]">Location</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Location Name" value={local.location?.name} onChange={v => saveLocationField('name', v)} />
                  <Field label="Address" value={local.location?.address} onChange={v => saveLocationField('address', v)} />
                  <Field label="Map URL" value={local.location?.mapUrl} onChange={v => saveLocationField('mapUrl', v)} />
                  <Field label="Parking Notes" value={local.location?.parkingNotes} onChange={v => saveLocationField('parkingNotes', v)} />
                </div>
              </div>

              <div className="border-t border-[#F2EFE9] pt-4 space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-[#9C8A7A]">Financials</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Package Name" value={local.packageName} onChange={v => saveField('packageName', v)} />
                  <Field label="Package Total ($)" value={local.packageTotal} onChange={v => saveField('packageTotal', parseFloat(v) || 0)} type="number" />
                  <Field label="Amount Paid ($)" value={local.amountPaid} onChange={v => saveField('amountPaid', parseFloat(v) || 0)} type="number" />
                  <Field label="Payment Due Date" value={local.paymentDueDate} onChange={v => saveField('paymentDueDate', v)} type="date" />
                  <Field label="Stripe Payment Link" value={local.stripePaymentLink} onChange={v => saveField('stripePaymentLink', v)} />
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1">Contract Signed</label>
                    <button
                      onClick={() => saveField('contractSigned', !local.contractSigned)}
                      className={`px-4 py-2 text-xs font-black rounded-xl border transition-colors ${
                        local.contractSigned
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-[#F2EFE9] border-[#E8E4E1] text-[#9C8A7A]'
                      }`}
                    >
                      {local.contractSigned ? 'Signed' : 'Not Signed'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Inspiration' && (
            <InspirationBoard client={local} onClientUpdate={handleClientUpdate} />
          )}

          {activeTab === 'Emails' && (
            <div className="space-y-3">
              {clientEmails.length === 0 && (
                <div className="py-10 text-center text-sm text-[#C0B0A0] font-medium">
                  No emails found for {client.email || 'this client'}.<br />
                  <span className="text-xs">Emails are pulled from the Email Ops inbox — make sure your Gmail is connected in Settings.</span>
                </div>
              )}
              {clientEmails.map(email => (
                <div key={email.id} className="p-4 bg-[#FAFAF8] border border-[#E8E4E1] rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-black text-[#2C2511] truncate">{email.subject}</div>
                    <div className="text-[10px] text-[#9C8A7A] whitespace-nowrap">
                      {email.date ? new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </div>
                  </div>
                  <div className="text-xs text-[#8A7A6A]">{email.from}</div>
                  <div className="text-xs text-[#6A5A4A] mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {email.text?.slice(0, 300)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Documents' && (
            <div className="space-y-4">
              <button
                onClick={handleDocUpload}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#5F6F65] hover:bg-[#4A6657] text-white text-xs font-black rounded-xl transition-colors"
              >
                <Upload size={14} /> Upload Document
              </button>
              {documents.length === 0 && (
                <div className="py-10 text-center text-sm text-[#C0B0A0] font-medium">
                  No documents uploaded yet.
                </div>
              )}
              {documents.map(doc => (
                <div key={doc.filename} className="flex items-center justify-between p-3 bg-[#FAFAF8] border border-[#E8E4E1] rounded-xl">
                  <div className="text-sm font-bold text-[#2C2511] truncate flex-1">{doc.label}</div>
                  <button onClick={() => handleDocDelete(doc.filename)} className="ml-3 text-[#9C8A7A] hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'SMS Log' && <SmsLogPanel client={local} />}

          {activeTab === 'Notes' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block">Session Notes</label>
              <textarea
                value={local.notes || ''}
                onChange={e => setLocal(l => ({ ...l, notes: e.target.value }))}
                onBlur={e => saveField('notes', e.target.value)}
                placeholder="Add private notes about this client or session…"
                rows={12}
                className="w-full px-4 py-3 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E4E1] flex items-center justify-between">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Delete Client
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-rose-600">Are you sure?</span>
              <button onClick={handleDelete} className="px-3 py-1.5 bg-rose-500 text-white text-xs font-black rounded-lg hover:bg-rose-600 transition-colors">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-[#F2EFE9] text-[#6A5A4A] text-xs font-black rounded-lg hover:bg-[#E8E4E1] transition-colors">
                Cancel
              </button>
            </div>
          )}
          <div className="text-[10px] text-[#C0B0A0] font-medium">
            {local.updatedAt ? `Updated ${new Date(local.updatedAt).toLocaleDateString()}` : ''}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClientProfileModal;
