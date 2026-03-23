# Locations Tab — Handoff Execution Plan

**Module:** Locations Library
**Status:** Not started
**Depends on:** No existing module changes — additive only
**Estimated files changed/created:** 4 modified, 1 new directory, 1 new component file

---

## Overview

Add a new "Locations" tab to the AZ Photo Command Center for managing a searchable, editable library of shoot locations. The module must feel native to the V3 workspace: same palette, same card/modal patterns, same animation style.

This plan is **purely additive**. No existing module is modified in a way that breaks current behavior.

---

## Exact Files to Touch

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/v3/App.jsx` | Modify | Add `MapPin` to imports, add `locations` NAV_ITEM, add `case 'locations'` to `renderContent` |
| `src/v3/utils/initialState.js` | Modify | Add `locations: []` to `defaultState`, add `emptyLocation` export, add backfill logic to `mergeState` |
| `src/v3/components/Locations/` | Create dir | New module directory |
| `src/v3/components/Locations/LocationsView.jsx` | Create | Full module: list view + modal |

---

## Step-by-Step Execution

---

### Step 1 — App.jsx: Navigation

**File:** `src/v3/App.jsx`

**1a. Add `MapPin` to the lucide-react import line.**

Current import (line 2):
```js
import { LayoutDashboard, Calculator, ShieldCheck, Mail, Settings, Camera, BarChart2, CalendarDays } from 'lucide-react'
```

New import:
```js
import { LayoutDashboard, Calculator, ShieldCheck, Mail, Settings, Camera, BarChart2, CalendarDays, MapPin } from 'lucide-react'
```

**1b. Add import for the new view, after the existing view imports (after line ~14):**
```js
import LocationsView from './components/Locations/LocationsView'
```

**1c. Add to `NAV_ITEMS` array — insert after `sessions` and before `taxes` (or wherever feels natural; after `sessions` is recommended since locations relate to shoot planning):**
```js
{ id: 'locations', label: 'Locations', icon: MapPin, built: true },
```

Resulting NAV_ITEMS order:
```
dashboard → sessions → locations → taxes → packages → health → compliance → email → settings
```

**1d. Add to `renderContent` switch — insert after `case 'sessions'`:**
```js
case 'locations': return <LocationsView />;
```

**No other changes to App.jsx.** The sidebar renders NAV_ITEMS dynamically, so adding the item is sufficient to make it appear.

---

### Step 2 — initialState.js: State Shape

**File:** `src/v3/utils/initialState.js`

**2a. Add `emptyLocation` export** — insert directly after the `emptyClient` block (after line ~33):

```js
export const emptyLocation = {
  id: '',
  name: '',
  notes: '',
  mapUrlGoogle: '',
  mapUrlApple: '',
  photos: [],          // Array of filename strings (stored via clientSaveFile with clientId: 'global_locations')
  updatedAt: '',
};
```

**2b. Add `locations: []` to `defaultState`** — insert after `bookedClients: []` entry:

```js
locations: [],
```

**2c. Add backfill in `mergeState`** — insert after the `bookedClients` backfill block (after line ~93):

```js
// Backfill missing keys on location records
if (Array.isArray(merged.locations)) {
  merged.locations = merged.locations.map(loc => ({
    ...emptyLocation,
    ...loc,
  }));
} else {
  merged.locations = [];
}
```

**Why this matters:** Users upgrading from a state file that pre-dates this feature will have `locations` as `undefined`. The `mergeState` backfill guarantees it always initializes as an empty array, preventing crashes.

---

### Step 3 — LocationsView.jsx: Full Component

**File:** `src/v3/components/Locations/LocationsView.jsx`

Create the file from scratch. Implement in this order:

---

#### 3a. Imports

```jsx
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Search, X, ExternalLink, Upload, Trash2, ChevronRight, Copy, Check } from 'lucide-react'
import { useAppState } from '../../contexts/StateContext'
import { emptyLocation } from '../../utils/initialState'
```

---

#### 3b. Copy Utility Function

Define this outside all components, at the top of the file after the imports. It builds a plain-text block from a location object — photos are excluded by design.

```js
function buildLocationText(loc) {
  const lines = []
  if (loc.name)        lines.push(loc.name)
  if (loc.notes)       lines.push(`\nNotes:\n${loc.notes}`)
  if (loc.mapUrlGoogle) lines.push(`\nGoogle Maps: ${loc.mapUrlGoogle}`)
  if (loc.mapUrlApple)  lines.push(`Apple Maps: ${loc.mapUrlApple}`)
  return lines.join('\n')
}
```

This produces output like:
```
Gilbert Field

Notes:
Parking on the east side. Best light at golden hour facing west.

Google Maps: https://maps.google.com/?q=...
Apple Maps: https://maps.apple.com/?q=...
```

---

#### 3c. Top-level Component Shell

```jsx
export default function LocationsView() {
  const { state, updateState } = useAppState()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)   // location object or null
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

  return (
    <div className="flex flex-col h-full bg-[#FDFCFB] overflow-hidden">
      <Header search={search} setSearch={setSearch} onNew={openNew} />
      <LocationGrid locations={filtered} onEdit={openEdit} />
      <AnimatePresence>
        {showModal && selected && (
          <LocationModal
            location={selected}
            onClose={closeModal}
            onSave={(updated) => {
              const exists = locations.find(l => l.id === updated.id)
              const next = exists
                ? locations.map(l => l.id === updated.id ? updated : l)
                : [...locations, updated]
              updateState({ locations: next })
              setSelected(updated)
            }}
            onDelete={(id) => {
              updateState({ locations: locations.filter(l => l.id !== id) })
              closeModal()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

#### 3d. Header Sub-component

Sticky header, never scrolls away. Matches the pattern used in SessionsView and PackageCalculatorView.

```jsx
function Header({ search, setSearch, onNew }) {
  return (
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
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#5F6F65] text-white text-sm font-bold rounded-xl hover:bg-[#4E5D54] transition-colors"
        >
          <Plus size={14} />
          Add Location
        </button>
      </div>
    </div>
  )
}
```

---

#### 3e. Location Grid Sub-component

Responsive grid. Cards show name, notes snippet, and a chevron hint. Empty state if no locations or no search results.

```jsx
function LocationGrid({ locations, onEdit }) {
  if (locations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
        <div className="w-14 h-14 rounded-2xl bg-[#F4F1EE] flex items-center justify-center mb-4">
          <MapPin size={24} className="text-[#9C8A7A]" />
        </div>
        <p className="font-black text-[#2C2511] text-lg">No locations yet</p>
        <p className="text-sm text-[#9C8A7A] mt-1">Add your first shoot location to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <LocationCard key={loc.id} location={loc} onClick={() => onEdit(loc)} />
        ))}
      </div>
    </div>
  )
}
```

---

#### 3f. Location Card Sub-component

The card has two interactive zones: the main body (opens the modal) and a copy button (copies text, stops propagation). The copy button is hidden until hover, uses a `copied` flash state that resets after 1.5 seconds.

```jsx
function LocationCard({ location, onClick }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    e.stopPropagation()   // prevent modal from opening
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
          {/* Copy button — visible on hover only */}
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
        <p className="text-xs text-[#9C8A7A] mt-3 leading-relaxed line-clamp-2">{location.notes}</p>
      )}
      {location.photos?.length > 0 && (
        <p className="text-[10px] text-[#5F6F65] font-bold mt-3 uppercase tracking-widest">
          {location.photos.length} photo{location.photos.length !== 1 ? 's' : ''}
        </p>
      )}
    </button>
  )
}
```

**Why `<span>` not `<button>` for the copy trigger:** The card itself is a `<button>`, and nesting a `<button>` inside a `<button>` is invalid HTML. Use a `<span>` with `onClick` and `e.stopPropagation()` instead.
```

---

#### 3g. Location Modal Sub-component

Slide-over panel from the right — mirrors the exact animation pattern from `ClientProfileModal.jsx`.

**Animation pattern (copy exactly from ClientProfileModal):**
- Backdrop: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}`
- Panel: `initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}` with `transition={{ type: 'spring', damping: 30, stiffness: 300 }}`
- Panel width: `w-[600px] max-w-full`

**Fields to render in the modal:**
1. Location Name (text input, required)
2. Notes (textarea, 4 rows)
3. Google Maps URL (text input)
4. Apple Maps URL (text input)
5. Map buttons (conditional — only show if URL is filled)
6. Photos section (upload + grid display)
7. Delete button (bottom, destructive — only if editing an existing record)

**Field component** — copy the `Field` pattern from `ClientProfileModal.jsx`:
```jsx
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
)
```

**State pattern in modal:**
```jsx
function LocationModal({ location, onClose, onSave, onDelete }) {
  const [local, setLocal] = useState({ ...location })
  const [imgSrcs, setImgSrcs] = useState({})   // { filename: base64DataUrl }
  const [copied, setCopied] = useState(false)
  const isNew = !location.updatedAt            // New record if never saved

  const updateField = (key, value) => {
    const updated = { ...local, [key]: value, updatedAt: new Date().toISOString() }
    setLocal(updated)
    onSave(updated)    // Persist immediately on every change (matches ClientProfileModal pattern)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(buildLocationText(local))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // ... photo upload / read / delete handlers (see Step 3h)
}
```

**Copy button in modal header** — place it next to the X close button so it's always accessible while editing:

```jsx
{/* Modal header row */}
<div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4E1] flex-shrink-0">
  <div className="flex items-center gap-2.5">
    <div className="w-8 h-8 rounded-xl bg-[#EEF2EE] flex items-center justify-center">
      <MapPin size={14} className="text-[#5F6F65]" />
    </div>
    <p className="font-black text-[#2C2511] text-sm">{local.name || 'New Location'}</p>
  </div>
  <div className="flex items-center gap-2">
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
```

**Map buttons — render conditionally:**
```jsx
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
```

---

#### 3h. Photo Upload & Display (inside LocationModal)

**Important:** Use `clientId: 'global_locations'` for all `clientSaveFile` / `clientReadFile` calls. This is a reserved global namespace — it does not collide with any client record because client IDs are `crypto.randomUUID()` UUIDs (not the string `'global_locations'`).

**Upload handler — mirrors InspirationBoard.jsx exactly:**
```js
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
```

**Prefix filenames with `local.id`** (the location's UUID) so photos from different locations don't collide inside the same `global_locations` folder.

**Read images into state for display:**
```js
useEffect(() => {
  if (!window.electronAPI || !local.photos?.length) return
  local.photos.forEach(async (filename) => {
    if (imgSrcs[filename]) return   // already loaded
    const res = await window.electronAPI.clientReadFile({ clientId: 'global_locations', filename })
    if (res?.success) {
      setImgSrcs(prev => ({ ...prev, [filename]: `data:image/jpeg;base64,${res.data}` }))
    }
  })
}, [local.photos])
```

**Display photos in a 2-column grid below the upload button:**
```jsx
<div className="grid grid-cols-2 gap-2 mt-3">
  {(local.photos || []).map(filename => (
    <div key={filename} className="relative group rounded-2xl overflow-hidden bg-[#F4F1EE] aspect-video">
      {imgSrcs[filename]
        ? <img src={imgSrcs[filename]} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#9C8A7A] border-t-transparent rounded-full animate-spin" />
          </div>
      }
      <button
        onClick={() => {
          window.electronAPI?.clientDeleteFile({ clientId: 'global_locations', filename })
          updateField('photos', local.photos.filter(p => p !== filename))
        }}
        className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/80 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={10} className="text-red-500" />
      </button>
    </div>
  ))}
</div>
```

---

#### 3i. Delete Location Button (in modal footer)

Only render if `!isNew` (i.e., the record has been saved before):

```jsx
{!isNew && (
  <button
    onClick={() => {
      // Optionally: delete all photos from disk first
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
)}
```

---

## Complete Modal Layout Structure

```
[Backdrop overlay]
  [Panel — w-[600px], slides from right]
    [Header row]
      MapPin icon + location name (or "New Location")
      [Copy button — Check icon on flash, Copy icon at rest]
      [X close button]

    [Scrollable body — overflow-y-auto]
      Section: Details
        Field: Location Name
        Field: Notes (textarea)

      Section: Map Links
        Field: Google Maps URL
        Field: Apple Maps URL
        [Map buttons — conditional]

      Section: Photos
        Upload button
        2-col photo grid

    [Footer]
      Delete Location button (left, only if editing)
```

---

## Non-Interference Checklist

Before writing any code, verify these are safe:

- [ ] `MapPin` is not already imported in `App.jsx` (it isn't — confirmed from exploration)
- [ ] `'locations'` is not already a case in `renderContent` (it isn't — confirmed)
- [ ] `locations` key does not exist in `defaultState` (it doesn't — confirmed)
- [ ] `'global_locations'` is not used as a `clientId` anywhere (search `global_locations` in codebase — should return zero results)
- [ ] No existing component imports from `./components/Locations/` (directory does not exist yet)

Run this search before implementing:
```bash
grep -r "global_locations\|locations.*tab\|MapPin" src/v3/
```

---

## Implementation Order

Execute in this exact order to avoid ever breaking the running app:

1. **`initialState.js`** — Add `emptyLocation`, `locations: []`, and `mergeState` backfill. Safe to do first since no UI depends on it yet.
2. **`LocationsView.jsx`** — Build the entire component file. It will not be rendered until Step 3.
3. **`App.jsx`** — Add import, NAV_ITEM, and `renderContent` case. This is the final step that wires everything together and makes the tab visible.

---

## Dev Testing Checklist

After implementation, verify each of these manually:

- [ ] "Locations" tab appears in the left nav with a MapPin icon
- [ ] Tab is active/highlighted when selected, matches other nav items visually
- [ ] Empty state renders when no locations exist
- [ ] "Add Location" button opens the modal
- [ ] Typing in any field immediately persists (verified by switching tabs and returning)
- [ ] Search bar filters by name and notes
- [ ] Google Maps button opens correct URL in browser (requires Electron runtime)
- [ ] Apple Maps button opens correct URL in browser
- [ ] Copy button on card (hover to reveal) copies name, notes, and map URLs — not photo filenames
- [ ] Copy button in modal header copies the same text
- [ ] Both copy buttons flash a Check icon for 1.5s then revert to Copy icon
- [ ] Clicking the card copy button does NOT open the modal (stopPropagation working)
- [ ] Photo upload works: file picker opens, image appears in grid
- [ ] Photo persists after closing and reopening the modal
- [ ] Photo delete button removes image from display and from disk
- [ ] Delete Location button removes the card from the grid
- [ ] Deleting a location also cleans up its photo files from disk
- [ ] App state persists across full restart (quit and relaunch Electron)
- [ ] No console errors in existing tabs after the change

---

## Notes & Gotchas

**`isNew` logic:** A location is "new" if it has no `updatedAt` timestamp. This is set by `updateField` on first edit. If a user opens the "Add Location" modal and immediately closes without typing anything, the location will not be saved (since `onSave` is only called from `updateField`). This is intentional — matches the existing Sessions behavior where clicking away from a new client discards it.

If you want auto-save on modal open for new locations, call `onSave(local)` in a `useEffect(() => { if (isNew) onSave(local) }, [])` inside the modal. Only do this if the UX warrants it.

**`openExternal` signature:** Per `preload.js`, the method signature is `openExternal: (url) => ipcRenderer.invoke('open-external', url)`. Pass the URL string directly — **not** as an object. Example: `window.electronAPI.openExternal('https://maps.google.com/...')`.

**Photos in browser dev mode:** `window.electronAPI` is `undefined` in Vite dev mode (`npm run dev`). Wrap all IPC calls with `if (!window.electronAPI) return` guards. Photo upload and map-open buttons should degrade gracefully (do nothing or show a console warning).

**Textarea for Notes:** The `Field` component uses `<input>`. For the Notes field, create an inline textarea override:
```jsx
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
```

**`line-clamp-2`** on the card notes snippet requires Tailwind v3.3+ or the `@tailwindcss/line-clamp` plugin. If the class has no effect, replace with:
```jsx
style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
```
