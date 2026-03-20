# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev        # Vite dev server on port 5173 (browser mode)
npm start          # Launch Electron desktop app

# Build & Distribution
npm run build      # Build React app to dist/v3
npm run preview    # Preview production build
npm run package    # Package Electron app (.asar)
npm run make       # Build distributable DMG/ZIP for macOS
```

No test suite is configured.

## Architecture

This is an **Electron 29 + React 18** desktop application — a business command center for a photography LLC (AZ Photo / The Love Lens by Ariana).

### Dual-mode rendering

`main.js` has a `V3_MODE` flag. When `true` (current default), Electron loads the React app from `dist/v3`. When `false`, it injects a remotely-fetched HTML payload (downloaded from GitHub every 3 minutes and cached in `latest.html`). The remote-fetch path is legacy; active development targets V3.

### State management

Global state lives in `src/v3/contexts/StateContext.jsx`. Components access it via `useAppState()`. Writes are debounced (1s) then persisted via Electron IPC → `azphoto_store.json` in the user's app data directory. In browser dev mode (no Electron), state falls back to `localStorage`.

State shape and defaults are defined in `src/v3/utils/initialState.js`.

### IPC bridge

`preload.js` exposes a safe `window.electronAPI` context bridge with: `getState`, `setState`, `fetchInbox`, `openAppleMailReply`, `fetchProxy`, `openExternal`. All Electron ↔ renderer communication must go through this bridge.

### Email integration

`main.js` handles Gmail IMAP fetching (`imap-simple`, `mailparser`) and reply injection into Apple Mail via AppleScript (`nodemailer`). Gmail credentials (IMAP app password) are stored in app state and passed via IPC.

### Tax engine

`src/v3/utils/taxEngine.js` contains `calculateTaxes()` — computes self-employment tax (15.3%), federal progressive brackets (2025/2026), and Arizona state flat tax (2.5%). This is the core business logic for the Tax Planner module.

### Styling

Tailwind CSS with a custom palette defined in `tailwind.config.js`: `sage` (greens), `linen` (warm neutrals), `charcoal` (darks). Use these tokens rather than raw color values.

### App modules

Navigation is tab-based in `src/v3/App.jsx`. Modules: Dashboard, Tax Planner, Compliance, CRM/Leads, Email Operations, Settings. Each module has its own directory under `src/v3/components/`.

### Build output

- Vite → `dist/v3/`
- Electron Forge → `out/` (DMG + ZIP makers configured for macOS)
