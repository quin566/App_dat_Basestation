import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X, Check } from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';
import { emptyClient } from '../../utils/initialState';

const normalizeShootType = (raw) => {
  if (!raw) return 'other';
  const v = raw.toLowerCase();
  if (v.includes('wedding')) return 'wedding';
  if (v.includes('engagement')) return 'engagement';
  if (v.includes('family')) return 'family';
  return 'other';
};

const mapRow = (row) => ({
  ...emptyClient,
  id: crypto.randomUUID(),
  name:          row['Client Name']    || row['Name']         || '',
  email:         row['Email']          || row['email']        || '',
  phone:         row['Phone']          || row['phone']        || '',
  shootDate:     row['Session Date']   || row['Date']         || '',
  shootTime:     row['Session Time']   || row['Time']         || '',
  shootType:     normalizeShootType(row['Session Type'] || row['Type']),
  location:      { name: row['Location'] || '', address: '', mapUrl: '', parkingNotes: '' },
  packageName:   row['Package']        || '',
  packageTotal:  parseFloat(row['Total'])       || 0,
  amountPaid:    parseFloat(row['Amount Paid']) || 0,
  contractSigned: (row['Contract Signed'] || '').toLowerCase() === 'yes',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const PixisetImport = ({ onClose }) => {
  const { state, updateState } = useAppState();
  const [preview, setPreview] = useState(null); // { toAdd: [], toSkip: [] }
  const [done, setDone] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const existingEmails = new Set(state.bookedClients.map(c => c.email?.toLowerCase()).filter(Boolean));
        const toAdd = [];
        const toSkip = [];
        rows.forEach(row => {
          const mapped = mapRow(row);
          if (mapped.email && existingEmails.has(mapped.email.toLowerCase())) {
            toSkip.push(mapped);
          } else {
            toAdd.push(mapped);
          }
        });
        setPreview({ toAdd, toSkip });
      },
      error: (err) => {
        console.error('[PixisetImport] CSV parse error:', err);
      },
    });
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleConfirm = () => {
    if (!preview) return;
    updateState({ bookedClients: [...state.bookedClients, ...preview.toAdd] });
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <Check size={28} className="text-emerald-600" />
        </div>
        <div className="text-lg font-black text-[#2C2511]">Import Complete</div>
        <p className="text-sm text-[#8A7A6A] font-medium text-center">
          {preview?.toAdd.length} client{preview?.toAdd.length !== 1 ? 's' : ''} added.
          {preview?.toSkip.length > 0 && ` ${preview.toSkip.length} duplicate${preview.toSkip.length !== 1 ? 's' : ''} skipped.`}
        </p>
        <button onClick={onClose} className="px-6 py-2.5 bg-[#5F6F65] text-white text-sm font-black rounded-xl hover:bg-[#4A6657] transition-colors">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-[#2C2511]">Import from Pixiset CSV</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#F2EFE9] flex items-center justify-center text-[#6A5A4A] hover:bg-[#E8E4E1] transition-colors">
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-[#9C8A7A] leading-relaxed">
        Export your client list from Pixiset as a CSV, then upload it here.
        Clients matched by email will be skipped to avoid duplicates.
        Column names are approximate — adjust if your CSV uses different headers.
      </p>

      {!preview && (
        <label
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-[#D4C4A8] rounded-2xl bg-[#FAF8F3] cursor-pointer hover:bg-[#F4F1EE] transition-colors"
        >
          <Upload size={28} className="text-[#9C8A7A]" />
          <div className="text-sm font-black text-[#5F6F65]">Drop a CSV here or click to browse</div>
          <div className="text-[10px] text-[#9C8A7A]">Accepts .csv files</div>
          <input type="file" accept=".csv" className="hidden" onChange={handleInputChange} />
        </label>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <div className="text-2xl font-black text-emerald-700">{preview.toAdd.length}</div>
              <div className="text-xs font-black text-emerald-600 mt-1">New clients</div>
            </div>
            <div className="p-4 bg-[#F2EFE9] border border-[#E8E4E1] rounded-xl text-center">
              <div className="text-2xl font-black text-[#9C8A7A]">{preview.toSkip.length}</div>
              <div className="text-xs font-black text-[#9C8A7A] mt-1">Already exist (skipped)</div>
            </div>
          </div>

          {preview.toAdd.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] mb-2">To Import</div>
              {preview.toAdd.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-[#FAFAF8] border border-[#E8E4E1] rounded-xl">
                  <span className="text-sm font-bold text-[#2C2511]">{c.name || '(no name)'}</span>
                  <span className="text-xs text-[#9C8A7A]">{c.email}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={preview.toAdd.length === 0}
              className="flex-1 py-3 bg-[#5F6F65] hover:bg-[#4A6657] text-white text-sm font-black rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {preview.toAdd.length} Client{preview.toAdd.length !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-3 bg-[#F2EFE9] text-[#6A5A4A] text-sm font-black rounded-xl hover:bg-[#E8E4E1] transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PixisetImport;
