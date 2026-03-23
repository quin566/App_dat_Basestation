import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Search, X, ExternalLink, Trash2, ChevronRight, Copy, Check, Upload } from 'lucide-react'
import { useAppState } from '../../contexts/StateContext'
import { emptyLocation } from '../../utils/initialState'

function buildLocationText(loc) {
  const lines = []
  if (loc.name)         lines.push(loc.name)
  if (loc.notes)        lines.push(`\nNotes:\n${loc.notes}`)
  if (loc.mapUrlGoogle) lines.push(`\nGoogle Maps: ${loc.mapUrlGoogle}`)
  if (loc.mapUrlApple)  lines.push(`Apple Maps: ${loc.mapUrlApple}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------
const Field = ({ label, value, onChange, placeholder = '' }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1">{label}</label>
    <input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30"
    />
  </div>
)

// ---------------------------------------------------------------------------
// LocationCard
// ---------------------------------------------------------------------------
function LocationCard({ location, onClick }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(buildLocationText(location))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-[#E8E4E1] rounded-3xl p-5 hover:border-[#5F6F65]/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#EEF2EE] flex items-center justify-center flex-shrink-0">
            <MapPin size={14} className="text-[#5F6F65]" />
          </div>
          <p className="font-black text-[#2C2511] text-sm truncate">{location.name || 'Unnamed Location'}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            onClick={handleCopy}
            title="Copy location info"
            className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#EEF2EE]"
          >
            {copied
              ? <Check size={12} className="text-[#5F6F65]" />
              : <Copy size={12} className="text-[#9C8A7A]" />
            }
          </span>
          <ChevronRight size={14} className="text-[#9C8A7A] mt-0.5 group-hover:text-[#5F6F65] transition-colors" />
        </div>
      </div>
      {location.notes && (
        <p
          className="text-xs text-[#9C8A7A] mt-3 leading-relaxed"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {location.notes}
        </p>
      )}
      {location.photos?.length > 0 && (
        <p className="text-[10px] text-[#5F6F65] font-bold mt-3 uppercase tracking-widest">
          {location.photos.length} photo{location.photos.length !== 1 ? 's' : ''}
        </p>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// LocationModal
// ---------------------------------------------------------------------------
function LocationModal({ location, onClose, onSave, onDelete }) {
  const [local, setLocal] = useState({ ...location })
  const [imgSrcs, setImgSrcs] = useState({})
  const [copied, setCopied] = useState(false)
  const isNew = !location.updatedAt

  const updateField = (key, value) => {
    const updated = { ...local, [key]: value, updatedAt: new Date().toISOString() }
    setLocal(updated)
    onSave(updated)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(buildLocationText(local))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Load images
  useEffect(() => {
    if (!window.electronAPI || !local.photos?.length) return
    local.photos.forEach(async (filename) => {
      if (imgSrcs[filename]) return
      const res = await window.electronAPI.clientReadFile({ clientId: 'global_locations', filename })
      if (res?.success) {
        setImgSrcs(prev => ({ ...prev, [filename]: `data:image/jpeg;base64,${res.data}` }))
      }
    })
  }, [local.photos])

  const handlePhotoUpload = () => {
    if (!window.electronAPI) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const filename = `${local.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const res = await window.electronAPI.clientSaveFile({
          clientId: 'global_locations',
          filename,
          buffer: Array.from(new Uint8Array(ev.target.result)),
        })
        if (res?.success) {
          updateField('photos', [...(local.photos || []), filename])
        }
      }
      reader.readAsArrayBuffer(file)
    }
    input.click()
  }

  const handlePhotoDelete = (filename) => {
    window.electronAPI?.clientDeleteFile({ clientId: 'global_locations', filename })
    updateField('photos', (local.photos || []).filter(p => p !== filename))
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 z-40"
      />
      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-[600px] max-w-full bg-[#FDFCFB] shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#EEF2EE] flex items-center justify-center flex-shrink-0">
              <MapPin size={14} className="text-[#5F6F65]" />
            </div>
            <p className="font-black text-[#2C2511] text-sm truncate">{local.name || 'New Location'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              title="Copy location info"
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#F4F1EE] transition-colors"
            >
              {copied
                ? <Check size={14} className="text-[#5F6F65]" />
                : <Copy size={14} className="text-[#9C8A7A]" />
              }
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#F4F1EE] transition-colors"
            >
              <X size={14} className="text-[#9C8A7A]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Details */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A]">Details</p>
            <Field
              label="Location Name"
              value={local.name}
              onChange={v => updateField('name', v)}
              placeholder="e.g. Gilbert Field, Superstition Mountain"
            />
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A] block mb-1">Notes</label>
              <textarea
                value={local.notes || ''}
                onChange={e => updateField('notes', e.target.value)}
                rows={4}
                placeholder="Parking info, entrance details, best lighting times..."
                className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E8E4E1] rounded-xl text-sm font-medium text-[#2C2511] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 resize-none"
              />
            </div>
          </div>

          {/* Map Links */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A]">Map Links</p>
            <Field
              label="Google Maps URL"
              value={local.mapUrlGoogle}
              onChange={v => updateField('mapUrlGoogle', v)}
              placeholder="https://maps.google.com/..."
            />
            <Field
              label="Apple Maps URL"
              value={local.mapUrlApple}
              onChange={v => updateField('mapUrlApple', v)}
              placeholder="https://maps.apple.com/..."
            />
            {(local.mapUrlGoogle || local.mapUrlApple) && (
              <div className="flex gap-2 flex-wrap">
                {local.mapUrlGoogle && (
                  <button
                    onClick={() => window.electronAPI?.openExternal(local.mapUrlGoogle)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#EEF2EE] text-[#5F6F65] text-xs font-bold rounded-xl hover:bg-[#5F6F65] hover:text-white transition-colors"
                  >
                    <ExternalLink size={12} />
                    Open in Google Maps
                  </button>
                )}
                {local.mapUrlApple && (
                  <button
                    onClick={() => window.electronAPI?.openExternal(local.mapUrlApple)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#EEF2EE] text-[#5F6F65] text-xs font-bold rounded-xl hover:bg-[#5F6F65] hover:text-white transition-colors"
                  >
                    <ExternalLink size={12} />
                    Open in Apple Maps
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9C8A7A]">Photos</p>
            <button
              onClick={handlePhotoUpload}
              className="flex items-center gap-2 px-3 py-2 bg-[#F4F1EE] text-[#5F6F65] text-xs font-bold rounded-xl hover:bg-[#EEF2EE] transition-colors"
            >
              <Upload size={12} />
              Upload Photo
            </button>
            {(local.photos || []).length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {(local.photos || []).map(filename => (
                  <div key={filename} className="relative group rounded-2xl overflow-hidden bg-[#F4F1EE] aspect-video">
                    {imgSrcs[filename]
                      ? <img src={imgSrcs[filename]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-[#9C8A7A] border-t-transparent rounded-full animate-spin" />
                        </div>
                    }
                    <button
                      onClick={() => handlePhotoDelete(filename)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/80 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!isNew && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-[#E8E4E1]">
            <button
              onClick={() => {
                ;(local.photos || []).forEach(filename =>
                  window.electronAPI?.clientDeleteFile({ clientId: 'global_locations', filename })
                )
                onDelete(local.id)
              }}
              className="flex items-center gap-2 px-4 py-2 text-red-500 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete Location
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}

// ---------------------------------------------------------------------------
// LocationsView (root)
// ---------------------------------------------------------------------------
export default function LocationsView() {
  const { state, updateState } = useAppState()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const locations = state.locations || []

  const filtered = locations.filter(loc =>
    loc.name.toLowerCase().includes(search.toLowerCase()) ||
    loc.notes.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setSelected({ ...emptyLocation, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
    setShowModal(true)
  }

  const openEdit = (loc) => {
    setSelected(loc)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelected(null)
  }

  const handleSave = (updated) => {
    const exists = locations.find(l => l.id === updated.id)
    const next = exists
      ? locations.map(l => l.id === updated.id ? updated : l)
      : [...locations, updated]
    updateState({ locations: next })
    setSelected(updated)
  }

  const handleDelete = (id) => {
    updateState({ locations: locations.filter(l => l.id !== id) })
    closeModal()
  }

  return (
    <div className="flex flex-col h-full bg-[#FDFCFB] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-[#E8E4E1] bg-[#FDFCFB]">
        <div>
          <h1 className="text-2xl font-black text-[#2C2511] tracking-tight">Locations</h1>
          <p className="text-xs text-[#9C8A7A] mt-0.5">Manage your shoot location library</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8A7A]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations..."
              className="pl-8 pr-4 py-2 text-sm bg-[#F4F1EE] border border-[#E8E4E1] rounded-xl text-[#2C2511] placeholder:text-[#9C8A7A] focus:outline-none focus:ring-2 focus:ring-[#5F6F65]/30 w-52"
            />
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#5F6F65] text-white text-sm font-bold rounded-xl hover:bg-[#4E5D54] transition-colors"
          >
            <Plus size={14} />
            Add Location
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
          <div className="w-14 h-14 rounded-2xl bg-[#F4F1EE] flex items-center justify-center mb-4">
            <MapPin size={24} className="text-[#9C8A7A]" />
          </div>
          <p className="font-black text-[#2C2511] text-lg">
            {search ? 'No results' : 'No locations yet'}
          </p>
          <p className="text-sm text-[#9C8A7A] mt-1">
            {search ? 'Try a different search term.' : 'Add your first shoot location to get started.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(loc => (
              <LocationCard key={loc.id} location={loc} onClick={() => openEdit(loc)} />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && selected && (
          <LocationModal
            location={selected}
            onClose={closeModal}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
