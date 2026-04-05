import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Image, Plus, GripVertical, Calendar, Clock, Eye, CheckCircle2,
  AlertTriangle, ChevronDown, List, Columns3, Edit3, Trash2, X,
  Upload, ArrowUpDown, Filter, Camera, Sparkles, Search,
} from 'lucide-react';
import { useAppState } from '../../contexts/StateContext';
import { toast } from '../Toast';

// ── Constants ────────────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'shot',        label: 'Shot',                 icon: Camera,       color: '#8B7EC8', bg: '#F5F3FF',  border: '#E0DCFC' },
  { id: 'in-progress', label: 'In Progress Editing',  icon: Edit3,        color: '#D4A373', bg: '#FFF8F0',  border: '#F0DCC4' },
  { id: 'delivered',   label: 'Delivered',             icon: CheckCircle2, color: '#5F6F65', bg: '#F0F6F2',  border: '#D4E4D9' },
];

const EMPTY_FORM = {
  name: '', shootDate: '', dueDate: '', sneakPeekNeeded: false,
  sneakPeekDueDate: '', photoDataUrl: '', notes: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const daysUntil = (iso) => {
  if (!iso) return Infinity;
  const diff = Math.ceil((new Date(iso + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000);
  return diff;
};

const urgencyClass = (days) => {
  if (days < 0)  return { text: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200', label: 'Overdue',   dot: 'bg-rose-500' };
  if (days <= 2) return { text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', label: 'Due Soon',  dot: 'bg-amber-400' };
  if (days <= 7) return { text: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  label: `${days}d`,  dot: 'bg-blue-400' };
  return                { text: 'text-[#9C8A7A]',  bg: 'bg-[#F8F6F3]', border: 'border-[#E8E4E1]', label: `${days}d`,  dot: 'bg-[#C8C0B8]' };
};

const sneakPeekDefault = (shootDate) => {
  if (!shootDate) return '';
  const d = new Date(shootDate + 'T00:00:00');
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
};

// ── Drag-and-Drop Context ────────────────────────────────────────────────────────
// Lightweight drag state without external deps
const useDragAndDrop = (items, onReorder) => {
  const dragItem = useRef(null);
  const dragOverCol = useRef(null);

  const onDragStart = useCallback((e, id) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    // Make the drag image slightly transparent
    requestAnimationFrame(() => {
      e.target.style.opacity = '0.4';
    });
  }, []);

  const onDragEnd = useCallback((e) => {
    e.target.style.opacity = '1';
    dragItem.current = null;
    dragOverCol.current = null;
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e, columnId) => {
    e.preventDefault();
    const itemId = dragItem.current || e.dataTransfer.getData('text/plain');
    if (itemId) {
      onReorder(itemId, columnId);
    }
    dragItem.current = null;
  }, [onReorder]);

  return { onDragStart, onDragEnd, onDragOver, onDrop };
};

// ── Photo Upload Helper ──────────────────────────────────────────────────────────
const PhotoUpload = ({ value, onChange, size = 'md' }) => {
  const inputRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Image must be under 2MB', 'error');
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  const dim = size === 'sm' ? 'w-10 h-10' : 'w-20 h-20';
  const iconSize = size === 'sm' ? 14 : 20;

  return (
    <div className="relative group">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value ? (
        <div
          onClick={() => inputRef.current?.click()}
          className={`${dim} rounded-2xl overflow-hidden cursor-pointer ring-2 ring-transparent group-hover:ring-[#5F6F65]/30 transition-all`}
        >
          <img src={value} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className={`${dim} rounded-2xl border-2 border-dashed border-[#D8D0C0] flex items-center justify-center text-[#B0A090] hover:text-[#5F6F65] hover:border-[#5F6F65] transition-colors cursor-pointer`}
        >
          <Camera size={iconSize} />
        </button>
      )}
    </div>
  );
};

// ── Client Card (Kanban) ─────────────────────────────────────────────────────────
const ClientCard = ({ item, onEdit, onDragStart, onDragEnd }) => {
  const dueDays = daysUntil(item.dueDate);
  const sneakDueDays = item.sneakPeekNeeded ? daysUntil(item.sneakPeekDueDate) : Infinity;
  const mostUrgentDays = Math.min(dueDays, sneakDueDays);
  const urg = urgencyClass(mostUrgentDays);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(item)}
      className="bg-white rounded-2xl border border-[#E8E4E1] p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-[#D4D0CC] transition-all group relative"
    >
      {/* Drag handle */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical size={14} className="text-[#9C8A7A]" />
      </div>

      <div className="flex items-start gap-3">
        {/* Photo thumbnail */}
        {item.photoDataUrl && (
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-[#E8E4E1]">
            <img src={item.photoDataUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-[#2C2511] truncate">{item.name || 'Untitled'}</h4>

          {/* Dates row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {item.shootDate && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#9C8A7A]">
                <Camera size={10} /> {fmt(item.shootDate)}
              </span>
            )}
            {item.dueDate && (
              <span className={`flex items-center gap-1 text-[10px] font-bold ${urg.text}`}>
                <Clock size={10} /> {fmt(item.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sneak peek badge */}
      {item.sneakPeekNeeded && (
        <div className={`mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black ${
          sneakDueDays < 0
            ? 'bg-rose-50 text-rose-600 border border-rose-200'
            : sneakDueDays <= 2
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-violet-50 text-violet-600 border border-violet-200'
        }`}>
          <Eye size={10} />
          Sneak Peek {sneakDueDays < 0 ? 'OVERDUE' : `due ${fmt(item.sneakPeekDueDate)}`}
        </div>
      )}

      {/* Urgency pill */}
      {mostUrgentDays <= 7 && mostUrgentDays !== Infinity && (
        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${urg.bg} ${urg.text} border ${urg.border}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
          {urg.label}
        </div>
      )}
    </div>
  );
};

// ── Edit / Create Modal ──────────────────────────────────────────────────────────
const EditModal = ({ initial, isNew, onSave, onDelete, onClose }) => {
  const [form, setForm] = useState(initial || { ...EMPTY_FORM });
  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    // Auto-calc sneak peek due date when shoot date changes + sneak peek is on
    if (k === 'shootDate' && next.sneakPeekNeeded) {
      next.sneakPeekDueDate = sneakPeekDefault(v);
    }
    if (k === 'sneakPeekNeeded' && v && next.shootDate && !next.sneakPeekDueDate) {
      next.sneakPeekDueDate = sneakPeekDefault(next.shootDate);
    }
    return next;
  });

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[#F2EFE9]">
          <h2 className="text-lg font-black text-[#2C2511] flex items-center gap-2">
            <Image size={18} className="text-[#5F6F65]" />
            {isNew ? 'Add Gallery Client' : 'Edit Client'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F2EFE9] transition-colors">
            <X size={16} className="text-[#9C8A7A]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Photo + Name row */}
          <div className="flex items-start gap-4">
            <PhotoUpload value={form.photoDataUrl} onChange={(v) => set('photoDataUrl', v)} />
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1.5">Client Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Sarah & James"
                className="w-full px-4 py-2.5 border border-[#E8E4E1] rounded-xl text-sm font-bold text-[#2C2511] bg-[#FDFCFB] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition"
                autoFocus
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1.5">Shoot Date</label>
              <input
                type="date"
                value={form.shootDate}
                onChange={(e) => set('shootDate', e.target.value)}
                className="w-full px-4 py-2.5 border border-[#E8E4E1] rounded-xl text-sm font-bold text-[#2C2511] bg-[#FDFCFB] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1.5">Gallery Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="w-full px-4 py-2.5 border border-[#E8E4E1] rounded-xl text-sm font-bold text-[#2C2511] bg-[#FDFCFB] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition"
              />
            </div>
          </div>

          {/* Sneak Peek */}
          <div className="bg-[#F8F6F3] rounded-2xl p-4 border border-[#E8E4E1]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sneakPeekNeeded}
                onChange={(e) => set('sneakPeekNeeded', e.target.checked)}
                className="w-5 h-5 rounded-lg border-[#D8D0C0] text-[#5F6F65] focus:ring-[#5F6F65]/30"
              />
              <div>
                <span className="text-sm font-black text-[#2C2511]">Sneak peek needed</span>
                <p className="text-[10px] text-[#9C8A7A] mt-0.5">Auto-generates a due date 3 days after the shoot</p>
              </div>
            </label>

            {form.sneakPeekNeeded && (
              <div className="mt-3 pl-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1.5">Sneak Peek Due Date</label>
                <input
                  type="date"
                  value={form.sneakPeekDueDate}
                  onChange={(e) => set('sneakPeekDueDate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E8E4E1] rounded-xl text-sm font-bold text-[#2C2511] bg-white focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Any extra details..."
              className="w-full px-4 py-2.5 border border-[#E8E4E1] rounded-xl text-sm text-[#2C2511] bg-[#FDFCFB] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 focus:border-[#5F6F65] transition resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 pt-4 border-t border-[#F2EFE9]">
          {!isNew ? (
            <button
              onClick={() => { if (window.confirm('Delete this client from gallery tracking?')) onDelete(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-[#9C8A7A] hover:bg-[#F2EFE9] rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!form.name.trim()) return toast('Client name is required', 'error');
                onSave(form);
              }}
              className="px-6 py-2.5 bg-[#5F6F65] hover:bg-[#4A6657] text-white text-sm font-black rounded-xl transition-colors"
            >
              {isNew ? 'Add Client' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── List View Row ────────────────────────────────────────────────────────────────
const ListRow = ({ item, onEdit, colDef }) => {
  const dueDays = daysUntil(item.dueDate);
  const sneakDueDays = item.sneakPeekNeeded ? daysUntil(item.sneakPeekDueDate) : Infinity;
  const mostUrgent = Math.min(dueDays, sneakDueDays);
  const urg = urgencyClass(mostUrgent);

  return (
    <div
      onClick={() => onEdit(item)}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FDFCFB] border-b border-[#F5F2ED] cursor-pointer transition-colors group"
    >
      {/* Photo */}
      <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-[#F2EFE9] flex items-center justify-center">
        {item.photoDataUrl
          ? <img src={item.photoDataUrl} alt="" className="w-full h-full object-cover" />
          : <Camera size={14} className="text-[#C8C0B8]" />}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-[#2C2511] truncate">{item.name || 'Untitled'}</p>
      </div>

      {/* Status */}
      <div className="w-36 flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: colDef.bg, color: colDef.color, border: `1px solid ${colDef.border}` }}>
          <colDef.icon size={10} /> {colDef.label}
        </span>
      </div>

      {/* Shoot date */}
      <div className="w-24 text-xs font-bold text-[#9C8A7A] flex-shrink-0">{fmt(item.shootDate)}</div>

      {/* Due date */}
      <div className={`w-24 text-xs font-bold flex-shrink-0 ${urg.text}`}>{fmt(item.dueDate)}</div>

      {/* Sneak peek */}
      <div className="w-28 flex-shrink-0">
        {item.sneakPeekNeeded ? (
          <span className={`flex items-center gap-1 text-[10px] font-bold ${sneakDueDays < 0 ? 'text-rose-600' : sneakDueDays <= 2 ? 'text-amber-700' : 'text-violet-600'}`}>
            <Eye size={10} /> {fmt(item.sneakPeekDueDate)}
          </span>
        ) : (
          <span className="text-[10px] text-[#D0C8C0]">—</span>
        )}
      </div>

      {/* Urgency */}
      <div className="w-20 flex-shrink-0">
        {mostUrgent <= 7 && mostUrgent !== Infinity && (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${urg.bg} ${urg.text} border ${urg.border}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${urg.dot}`} />
            {urg.label}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main View ────────────────────────────────────────────────────────────────────
const GalleryDeliveryView = () => {
  const { state, updateState } = useAppState();
  const items = state.galleryDeliveries || [];

  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'
  const [editingItem, setEditingItem] = useState(null); // item object or 'new'
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── CRUD ───────────────────────────────────────────────────────────────────────
  const saveItem = useCallback((formData) => {
    if (editingItem === 'new') {
      const newItem = {
        ...formData,
        id: crypto.randomUUID(),
        status: 'shot',
        createdAt: new Date().toISOString(),
      };
      updateState({ galleryDeliveries: [...items, newItem] });
      toast('Client added to gallery delivery');
    } else {
      updateState({
        galleryDeliveries: items.map(i =>
          i.id === editingItem.id ? { ...i, ...formData, updatedAt: new Date().toISOString() } : i
        ),
      });
      toast('Client updated');
    }
    setEditingItem(null);
  }, [editingItem, items, updateState]);

  const deleteItem = useCallback(() => {
    if (!editingItem || editingItem === 'new') return;
    updateState({ galleryDeliveries: items.filter(i => i.id !== editingItem.id) });
    toast('Client removed');
    setEditingItem(null);
  }, [editingItem, items, updateState]);

  const moveToColumn = useCallback((itemId, newStatus) => {
    updateState({
      galleryDeliveries: items.map(i =>
        i.id === itemId ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i
      ),
    });
  }, [items, updateState]);

  const { onDragStart, onDragEnd, onDragOver, onDrop } = useDragAndDrop(items, moveToColumn);

  // ── Filtering & Sorting ────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let list = [...items];
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name?.toLowerCase().includes(q));
    }
    return list;
  }, [items, filterStatus, searchQuery]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'dueDate':         aVal = a.dueDate || 'z';           bVal = b.dueDate || 'z';           break;
        case 'shootDate':       aVal = a.shootDate || 'z';         bVal = b.shootDate || 'z';         break;
        case 'sneakPeekDueDate': aVal = a.sneakPeekDueDate || 'z'; bVal = b.sneakPeekDueDate || 'z'; break;
        case 'status': {
          const order = { shot: 0, 'in-progress': 1, delivered: 2 };
          aVal = order[a.status] ?? 9;
          bVal = order[b.status] ?? 9;
          break;
        }
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        default:
          aVal = a.dueDate || 'z';
          bVal = b.dueDate || 'z';
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredItems, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const overdue = items.filter(i => {
      const dd = daysUntil(i.dueDate);
      const sd = i.sneakPeekNeeded ? daysUntil(i.sneakPeekDueDate) : Infinity;
      return Math.min(dd, sd) < 0;
    }).length;
    const dueSoon = items.filter(i => {
      const dd = daysUntil(i.dueDate);
      const sd = i.sneakPeekNeeded ? daysUntil(i.sneakPeekDueDate) : Infinity;
      const m = Math.min(dd, sd);
      return m >= 0 && m <= 3;
    }).length;
    return {
      total: items.length,
      byCol: COLUMNS.map(c => ({ ...c, count: items.filter(i => i.status === c.id).length })),
      overdue,
      dueSoon,
    };
  }, [items]);

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 text-[#9C8A7A] text-xs font-bold uppercase tracking-widest mb-2">
          <Image size={13} />
          <span>Gallery Delivery</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black text-[#2C2511] tracking-tight">Gallery Tracker</h2>
            <p className="text-[#8A7A6A] mt-1.5 text-base">
              {items.length === 0
                ? 'Track gallery editing progress from shoot to delivery.'
                : `${stats.total} client${stats.total === 1 ? '' : 's'} · ${stats.byCol[2].count} delivered`}
            </p>
          </div>
          <button
            onClick={() => setEditingItem('new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5F6F65] hover:bg-[#4A6657] text-white text-sm font-black rounded-xl transition-colors"
          >
            <Plus size={15} /> Add Client
          </button>
        </div>
      </header>

      {/* Alert banners */}
      {stats.overdue > 0 && (
        <div className="mb-5 flex items-center gap-3 px-5 py-3 bg-rose-50 border border-rose-200 rounded-2xl">
          <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />
          <p className="text-sm font-bold text-rose-700">
            {stats.overdue} gallery {stats.overdue === 1 ? 'is' : 'deliveries are'} overdue — check your timeline
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#F2EFE9] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-lg transition-all ${
                viewMode === 'board' ? 'bg-white text-[#2C2511] shadow-sm' : 'text-[#9C8A7A] hover:text-[#5F6F65]'
              }`}
            >
              <Columns3 size={13} /> Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white text-[#2C2511] shadow-sm' : 'text-[#9C8A7A] hover:text-[#5F6F65]'
              }`}
            >
              <List size={13} /> List
            </button>
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-[#F2EFE9] border border-transparent rounded-xl text-xs font-bold text-[#5F6F65] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <Filter size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C8A7A] pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client…"
              className="pl-8 pr-3 py-2 bg-[#F2EFE9] rounded-xl text-xs font-bold text-[#2C2511] w-44 focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 placeholder:text-[#C0B8B0]"
            />
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C8A7A] pointer-events-none" />
          </div>
        </div>

        {/* Column stats pills */}
        <div className="flex items-center gap-2">
          {stats.byCol.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
              <c.icon size={10} /> {c.count}
            </div>
          ))}
          {stats.dueSoon > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
              <Clock size={10} /> {stats.dueSoon} due soon
            </div>
          )}
        </div>
      </div>

      {/* ── Board View ──────────────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-3 gap-5">
          {COLUMNS.map(col => {
            const colItems = filteredItems.filter(i => i.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
                className="rounded-2xl border-2 border-dashed transition-colors min-h-[320px] flex flex-col"
                style={{ borderColor: col.border, background: `${col.bg}40` }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                      <col.icon size={14} style={{ color: col.color }} />
                    </div>
                    <h3 className="text-sm font-black" style={{ color: col.color }}>{col.label}</h3>
                  </div>
                  <span className="text-xs font-black rounded-full w-6 h-6 flex items-center justify-center" style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto">
                  {colItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                        <col.icon size={16} style={{ color: col.color }} strokeWidth={1.5} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: col.color, opacity: 0.6 }}>
                        Drop clients here
                      </p>
                    </div>
                  ) : (
                    colItems.map(item => (
                      <ClientCard
                        key={item.id}
                        item={item}
                        onEdit={setEditingItem}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List View ───────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-[#E8E4E1] overflow-hidden">
          {/* List header */}
          <div className="flex items-center gap-4 px-5 py-3 bg-[#FDFCFB] border-b border-[#E8E4E1] text-[9px] font-black uppercase tracking-widest text-[#9C8A7A]">
            <div className="w-9 flex-shrink-0" /> {/* photo spacer */}
            <button onClick={() => toggleSort('name')} className="flex-1 min-w-0 flex items-center gap-1 hover:text-[#5F6F65] transition-colors cursor-pointer">
              Client {sortField === 'name' && <ArrowUpDown size={9} />}
            </button>
            <button onClick={() => toggleSort('status')} className="w-36 flex-shrink-0 flex items-center gap-1 hover:text-[#5F6F65] transition-colors cursor-pointer">
              Status {sortField === 'status' && <ArrowUpDown size={9} />}
            </button>
            <button onClick={() => toggleSort('shootDate')} className="w-24 flex-shrink-0 flex items-center gap-1 hover:text-[#5F6F65] transition-colors cursor-pointer">
              Shoot {sortField === 'shootDate' && <ArrowUpDown size={9} />}
            </button>
            <button onClick={() => toggleSort('dueDate')} className="w-24 flex-shrink-0 flex items-center gap-1 hover:text-[#5F6F65] transition-colors cursor-pointer">
              Due {sortField === 'dueDate' && <ArrowUpDown size={9} />}
            </button>
            <button onClick={() => toggleSort('sneakPeekDueDate')} className="w-28 flex-shrink-0 flex items-center gap-1 hover:text-[#5F6F65] transition-colors cursor-pointer">
              Sneak Peek {sortField === 'sneakPeekDueDate' && <ArrowUpDown size={9} />}
            </button>
            <div className="w-20 flex-shrink-0">Urgency</div>
          </div>

          {/* Rows */}
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles size={20} className="text-[#D0C8C0] mb-3" />
              <p className="text-sm font-bold text-[#9C8A7A]">No clients match your filters</p>
              <p className="text-xs text-[#C0B8B0] mt-1">Try adjusting the filter or adding new clients</p>
            </div>
          ) : (
            sortedItems.map(item => {
              const colDef = COLUMNS.find(c => c.id === item.status) || COLUMNS[0];
              return <ListRow key={item.id} item={item} onEdit={setEditingItem} colDef={colDef} />;
            })
          )}
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────────────── */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#F2EFE9] border border-[#E8E4E1] flex items-center justify-center mb-5">
            <Image size={28} className="text-[#5F6F65]" />
          </div>
          <h3 className="text-xl font-black text-[#2C2511] mb-2">No galleries yet</h3>
          <p className="text-sm text-[#8A7A6A] max-w-sm mb-6">
            Add your first client to start tracking gallery editing progress from shoot to delivery.
          </p>
          <button
            onClick={() => setEditingItem('new')}
            className="flex items-center gap-2 px-6 py-3 bg-[#5F6F65] hover:bg-[#4A6657] text-white text-sm font-black rounded-xl transition-colors"
          >
            <Plus size={15} /> Add Your First Client
          </button>
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────────── */}
      {editingItem && (
        <EditModal
          initial={editingItem === 'new' ? { ...EMPTY_FORM } : editingItem}
          isNew={editingItem === 'new'}
          onSave={saveItem}
          onDelete={deleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};

export default GalleryDeliveryView;
