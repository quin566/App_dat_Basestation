# Sessions Module — Handoff Document

**Feature:** Client Hub with calendar, SMS reminders, file storage, and Pixiset import
**Stack:** Electron 29 + React 18 + Tailwind (existing app)
**Date:** 2026-03-22

---

## Prerequisites

```bash
npm install twilio        # SMS
npm install papaparse     # CSV parsing (Pixiset import)
npm install framer-motion # Animations (confirm not already installed)
```

---

## Phase 1 — State & Storage Foundation

### 1a. Expand `initialState.js`

Replace `bookedClients: []` default with the full client shape. Each client:

```js
{
  id: '',                  // crypto.randomUUID()
  name: '',
  phone: '',               // E.164 format: +16025551234
  email: '',
  shootType: '',           // 'wedding' | 'engagement' | 'family' | 'other'
  shootDate: '',           // ISO: '2026-04-10'
  shootTime: '',           // '10:00'
  duration: '',            // '2 hours'
  location: {
    name: '',
    address: '',
    mapUrl: '',
    parkingNotes: '',
  },
  packageName: '',
  packageTotal: 0,
  amountPaid: 0,
  paymentDueDate: '',
  stripePaymentLink: '',
  contractSigned: false,
  contractUrl: '',
  inspirationAssets: [],   // [{ id, type: 'image'|'url'|'note', value, label, addedAt }]
  notes: '',
  emailThreadIds: [],      // matched from IMAP fetch by client email address
  smsReminders: {
    threeDaySent: false,
    morningOfSent: false,
  },
  tags: [],
  createdAt: '',
  updatedAt: '',
}
```

Update `mergeState()` to ensure `bookedClients` items get missing keys backfilled (spread against empty client shape).

### 1b. File Storage IPC — `main.js`

Add four IPC handlers. Client files live at `app.getPath('userData')/clients/[clientId]/`.

```js
// Save a file for a client (inspiration image or document)
ipcMain.handle('client-save-file', async (event, { clientId, filename, buffer }) => {
  const dir = path.join(app.getPath('userData'), 'clients', clientId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), Buffer.from(buffer));
  return { success: true, filePath: path.join(dir, filename) };
});

// Read a file (returns base64 for renderer)
ipcMain.handle('client-read-file', async (event, { clientId, filename }) => {
  const filePath = path.join(app.getPath('userData'), 'clients', clientId, filename);
  const data = fs.readFileSync(filePath);
  return { success: true, data: data.toString('base64') };
});

// Delete a single file
ipcMain.handle('client-delete-file', async (event, { clientId, filename }) => {
  const filePath = path.join(app.getPath('userData'), 'clients', clientId, filename);
  fs.rmSync(filePath, { force: true });
  return { success: true };
});

// Delete entire client folder — MUST be called when a client record is deleted
ipcMain.handle('client-delete-folder', async (event, { clientId }) => {
  const dir = path.join(app.getPath('userData'), 'clients', clientId);
  fs.rmSync(dir, { recursive: true, force: true });
  return { success: true };
});
```

### 1c. Expose in `preload.js`

```js
clientSaveFile:   (payload) => ipcRenderer.invoke('client-save-file', payload),
clientReadFile:   (payload) => ipcRenderer.invoke('client-read-file', payload),
clientDeleteFile: (payload) => ipcRenderer.invoke('client-delete-file', payload),
clientDeleteFolder:(payload)=> ipcRenderer.invoke('client-delete-folder', payload),
```

**Critical:** Any function that removes a client from `bookedClients[]` state must also call `clientDeleteFolder({ clientId })`.

---

## Phase 2 — Sessions View

### 2a. Register tab in `App.jsx`

```js
// Add to NAV_ITEMS:
{ id: 'sessions', label: 'Sessions', icon: CalendarDays, built: true },

// Add to renderContent():
case 'sessions': return <SessionsView />;
```

Import `CalendarDays` from `lucide-react`.

### 2b. File structure

```
src/v3/components/Sessions/
  SessionsView.jsx       ← top-level layout (calendar + sidebar)
  CalendarGrid.jsx       ← hand-rolled monthly grid
  DayTimeline.jsx        ← hourly sidebar timeline
  ClientCard.jsx         ← summary card shown on calendar
  ClientProfileModal.jsx ← full detail modal/panel
  InspirationBoard.jsx   ← masonry image grid
  SmsLogPanel.jsx        ← reminder status per client
  PixisetImport.jsx      ← CSV import UI
```

### 2c. Layout — `SessionsView.jsx`

Two-column layout matching the calendar inspiration:

```
┌─────────────────────────────┬──────────────────────┐
│  Month/week grid (flex-1)   │  Sidebar (w-96)       │
│                             │  ┌─ Mini calendar ──┐  │
│  [Client cards on dates]    │  │  Month navigator  │  │
│                             │  │  Day grid w/ dots │  │
│                             │  └──────────────────┘  │
│                             │  ┌─ Day timeline ───┐  │
│                             │  │  Sessions for     │  │
│                             │  │  selected day     │  │
│                             │  └──────────────────┘  │
└─────────────────────────────┴──────────────────────┘
```

Clicking a session card anywhere opens `ClientProfileModal`.

### 2d. Shoot-type color tokens

Define once, import everywhere:

```js
// src/v3/utils/sessionColors.js
export const SHOOT_COLORS = {
  wedding:    { bg: 'bg-rose-50',   border: 'border-rose-200',   dot: 'bg-rose-400',   text: 'text-rose-700'   },
  engagement: { bg: 'bg-[#EEF2EE]', border: 'border-[#B8C9A6]', dot: 'bg-[#7A8C6E]', text: 'text-[#5F6F65]'  },
  family:     { bg: 'bg-[#F8F4EE]', border: 'border-[#D4C4A8]', dot: 'bg-[#A08060]', text: 'text-[#7A6040]'  },
  other:      { bg: 'bg-[#F2F2F0]', border: 'border-[#D0CFC8]', dot: 'bg-[#8A8A80]', text: 'text-[#606060]'  },
};
```

### 2e. `CalendarGrid.jsx` — hand-rolled

- Build the 7-column month grid with `getDay()` offset math — no library
- Each day cell: date number + colored dots (one per session that day, color = shoot type)
- Selected day: sage-tinted background
- Today: bold date number + underline
- Use Framer Motion `AnimatePresence` for month-to-month slide transitions

### 2f. `ClientProfileModal.jsx` — tabbed panel

Tabs: **Overview · Inspiration · Emails · Documents · SMS Log · Notes**

- Slides in from the right as a drawer (not a floating modal) using Framer Motion `x` animation
- Overview tab renders all booking fields as editable inline inputs — saves to state on blur
- Emails tab: filter `state.emails` (from existing IMAP fetch) where `fromEmail === client.email`
- Documents tab: file picker via `dialog.showOpenDialog` → `clientSaveFile` IPC
- On client delete: confirm dialog → delete from `bookedClients[]` → call `clientDeleteFolder`

---

## Phase 3 — Inspiration Board

**`InspirationBoard.jsx`**

- CSS columns masonry grid (2-col): `columns-2 gap-3`
- Each asset: image thumbnail or URL card or plain-text note card
- `+ Add` button opens a small popover with three options:
  1. **Upload file** → `dialog.showOpenDialog` (images only) → read as ArrayBuffer → `clientSaveFile` → store `{ type: 'image', value: filename, clientId }` in `inspirationAssets[]`
  2. **Paste URL** → text input → fetch image via existing `fetchProxy` IPC → save locally same as above
  3. **Add note** → text input → store `{ type: 'note', value: text }`
- Click any asset to expand full-size overlay
- Delete icon on hover → `clientDeleteFile` IPC + remove from `inspirationAssets[]`

---

## Phase 4 — Pixiset CSV Import

**`PixisetImport.jsx`** — lives inside Sessions view as a banner/button when `bookedClients` is empty, or an "Import" button in the header.

1. Open file picker filtered to `.csv`
2. Read file → parse with `papaparse`
3. Map columns to client shape:

```js
// Mapping will need adjustment once a real Pixiset CSV is examined.
// Expected Pixiset columns (approximate):
// "Client Name", "Email", "Phone", "Session Date", "Session Time",
// "Session Type", "Location", "Package", "Total", "Amount Paid", "Contract Signed"
const mapRow = (row) => ({
  id: crypto.randomUUID(),
  name:          row['Client Name']   || '',
  email:         row['Email']         || '',
  phone:         row['Phone']         || '',
  shootDate:     row['Session Date']  || '',
  shootTime:     row['Session Time']  || '',
  shootType:     normalizeShootType(row['Session Type']),
  location:      { name: row['Location'] || '', address: '', mapUrl: '', parkingNotes: '' },
  packageName:   row['Package']       || '',
  packageTotal:  parseFloat(row['Total'])       || 0,
  amountPaid:    parseFloat(row['Amount Paid']) || 0,
  contractSigned: row['Contract Signed'] === 'Yes',
  inspirationAssets: [], notes: '', emailThreadIds: [],
  smsReminders: { threeDaySent: false, morningOfSent: false },
  tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
```

4. Show diff preview: "X new clients, Y already exist (matched by email)" — user confirms before write
5. Upsert into `bookedClients[]` (match on email, don't duplicate)

> **Note:** Column names above are guesses. Adjust once a real export is examined. User to provide sample CSV when ready.

---

## Phase 5 — Twilio SMS Scheduler

### 5a. Settings UI — `SettingsView.jsx`

Add an "SMS Reminders" section with three fields:
- Twilio Account SID
- Twilio Auth Token
- Twilio From Number (format: +16025551234)

Store as `smsSettings: { accountSid: '', authToken: '', fromNumber: '' }` in state.

> ⚠️ **Reminder:** Ensure SMS consent is added to the Pixiset booking form before enabling.

### 5b. Scheduler — `main.js`

```js
const twilio = require('twilio');

function buildSmsMessage(client, type) {
  const dateStr = new Date(client.shootDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const unpaid  = client.packageTotal - client.amountPaid;

  if (type === 'three-day') {
    let msg = `Hi ${client.name.split(' ')[0]}! This is Ariana from The Love Lens. Your session is coming up on ${dateStr} at ${client.shootTime} at ${client.location.name}.`;
    if (client.location.mapUrl) msg += ` 📍 ${client.location.mapUrl}`;
    if (unpaid > 0) msg += ` You have a remaining balance of $${unpaid.toFixed(2)} due before your session.`;
    msg += ` Can't wait to see you!`;
    return msg;
  }

  if (type === 'morning-of') {
    return `Good morning ${client.name.split(' ')[0]}! Today's the day 🎉 Your session with Ariana is at ${client.shootTime} at ${client.location.name}. See you soon!`;
  }
}

async function checkAndSendReminders(store) {
  const { bookedClients = [], smsSettings = {} } = store;
  if (!smsSettings.accountSid || !smsSettings.authToken || !smsSettings.fromNumber) return;

  const twilioClient = twilio(smsSettings.accountSid, smsSettings.authToken);
  const now = new Date();
  let dirty = false;

  for (const client of bookedClients) {
    if (!client.phone || !client.shootDate) continue;

    const shootDate  = new Date(`${client.shootDate}T${client.shootTime || '08:00'}`);
    const threeDayMark = new Date(shootDate); threeDayMark.setDate(threeDayMark.getDate() - 3);
    const morningOf  = new Date(`${client.shootDate}T08:00`);

    // 3-day reminder: send if within the 3-day window and not yet sent
    if (!client.smsReminders.threeDaySent && now >= threeDayMark && now < shootDate) {
      try {
        await twilioClient.messages.create({
          body: buildSmsMessage(client, 'three-day'),
          from: smsSettings.fromNumber,
          to:   client.phone,
        });
        client.smsReminders.threeDaySent = true;
        dirty = true;
        console.log(`[SMS] 3-day reminder sent to ${client.name}`);
      } catch (err) {
        console.error(`[SMS] Failed for ${client.name}:`, err.message);
      }
    }

    // Morning-of: send between 8:00–8:59am on shoot day
    const isShootDay = now.toDateString() === shootDate.toDateString();
    const isAfter8   = now.getHours() === 8;
    if (!client.smsReminders.morningOfSent && isShootDay && isAfter8) {
      try {
        await twilioClient.messages.create({
          body: buildSmsMessage(client, 'morning-of'),
          from: smsSettings.fromNumber,
          to:   client.phone,
        });
        client.smsReminders.morningOfSent = true;
        dirty = true;
        console.log(`[SMS] Morning-of reminder sent to ${client.name}`);
      } catch (err) {
        console.error(`[SMS] Failed for ${client.name}:`, err.message);
      }
    }
  }

  // Persist if any reminders were sent
  if (dirty) {
    const storePath = path.join(app.getPath('userData'), 'azphoto_store.json');
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  }
}
```

**Wire up after `app.whenReady()`:**

```js
app.whenReady().then(() => {
  // ... existing window creation ...

  // SMS scheduler — check on startup and every hour
  const runSmsCheck = async () => {
    try {
      const storePath = path.join(app.getPath('userData'), 'azphoto_store.json');
      if (fs.existsSync(storePath)) {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        await checkAndSendReminders(store);
      }
    } catch (err) {
      console.error('[SMS Scheduler]', err.message);
    }
  };

  runSmsCheck();
  setInterval(runSmsCheck, 60 * 60 * 1000); // every hour
});
```

---

## Phase 6 — Email Threading Per Client

No new IPC needed. In `ClientProfileModal.jsx` Emails tab:

```js
// Filter existing fetched emails by client email address
const clientEmails = (state.emails || [])
  .filter(e => e.fromEmail === client.email || e.toEmail === client.email)
  .sort((a, b) => new Date(a.date) - new Date(b.date));
```

Note: `state.emails` is populated by the existing `fetchInbox` IPC. The Email Ops module already fetches and stores these. No duplication needed — just read and filter.

---

## Build Order

| Phase | Deliverable | Files touched |
|---|---|---|
| 1 | State shape + file storage IPC | `initialState.js`, `main.js`, `preload.js` |
| 2 | Sessions view + calendar grid + client profile modal | `App.jsx` + new `Sessions/` dir |
| 3 | Inspiration board | `InspirationBoard.jsx` |
| 4 | Pixiset CSV import | `PixisetImport.jsx` |
| 5 | Twilio SMS scheduler + settings UI | `main.js`, `SettingsView.jsx` |
| 6 | Email threading in profile modal | `ClientProfileModal.jsx` |

---

## Open Items

- [ ] Pixiset CSV column names unconfirmed — adjust `mapRow()` once a real export is examined
- [ ] Twilio account needs to be created + 10DLC registered (business name: AZ Photo LLC)
- [ ] ⚠️ **Add SMS consent to Pixiset booking form before Phase 5 goes live**
- [ ] Confirm Framer Motion is already a dependency (`grep framer package.json`) — install if not
