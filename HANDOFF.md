# Stripe Financial Connections — Debug & Fix Handoff

## Status: Fixed in v2.4.1 — Awaiting Chase live-flow validation

---

## Root Causes Found (all five fixed)

### 1. `return_url: 'azphotoapp://stripe-return'` in `sessions.create` — PRIMARY "nothing happens" bug
**What happened:** `stripe.financialConnections.sessions.create()` was called with `return_url: 'azphotoapp://stripe-return'`. Stripe's API only accepts `https://` URLs in `return_url`. This caused an immediate API validation error, returning `{ success: false }` from the IPC handler. The renderer called `cancelLink()` instantly — the button reset so fast it looked like nothing happened. `shell.openExternal` was never reached.

**Fix:** Removed `return_url` entirely from `sessions.create`. Completion is now signalled by a local HTTP `/done` endpoint (see #5).

---

### 2. `isLinking` permanently stuck — secondary "button disabled" bug
**What happened:** When Safari opened but the Chase/Stripe flow failed before completing (no completion signal ever fired), `isLinking` stayed `true` forever. The button showed "Linking…" and was `disabled`. Every subsequent tap did nothing.

**Fix:** Added `cancelLink()` helper that clears the timeout and resets all linking state. Added a 10-minute safety timeout that auto-calls `cancelLink()` if no completion signal arrives. Added an explicit **Cancel** button so the user can reset without restarting the app.

---

### 3. `synchronize` endpoint missing `mobile[platform]=ios`
**What happened:** (Prior approach) The `synchronize` call was sent without `mobile[platform]=ios`. Without this parameter, Stripe returns a web-flow response without `manifest.hosted_auth_url`. The code got a valid HTTP 200 with a different JSON structure, found no URL, and returned `{ success: false }`.

**Fix:** Entire `synchronize` approach abandoned in favour of a local HTTP server (see #5).

---

### 4. Chase "something went wrong" — return_url / flow type mismatch
**What happened:** (Prior approach) Used `stripe.collectFinancialConnectionsAccounts()` from Stripe.js inside an Electron BrowserWindow. Stripe.js passed `returnUrl: 'azphotoapp://stripe-return'` from the client side. Stripe's web SDK does not support custom URL schemes in `returnUrl`. Chase showed "something went wrong" because the redirect back to a custom scheme is only supported in Stripe's mobile SDK flow pattern.

**Fix:** Browser now opens `http://127.0.0.1:PORT/` via `shell.openExternal`. No `returnUrl` is passed — completion goes through the local server's `/done` endpoint instead of any URL redirect.

---

### 5. No completion-signalling mechanism
**What happened:** There was no reliable way for the browser page to signal back to the Electron app that the Stripe auth completed, without a deep-link redirect.

**Fix:** `stripe-open-link-window` now:
1. Spins up a local HTTP server on `127.0.0.1` with a random OS-assigned port
2. Opens `http://127.0.0.1:PORT/` in Safari via `shell.openExternal`
3. The page calls `stripe.collectFinancialConnectionsAccounts({ clientSecret })` with no `returnUrl`
4. On success, the page calls `fetch('/done')` on the same local server
5. The `/done` handler sends `stripe-auth-complete` IPC event to the renderer with `sessionId`
6. The renderer calls `stripeGetAccounts(sessionId)` and updates bank accounts in state

---

## Files Changed

| File | Change |
|------|--------|
| `main.js` | Removed `return_url` from `sessions.create`; made `account.retrieve()` optional; replaced `synchronize` approach with local HTTP server; added `/done` endpoint that sends `stripe-auth-complete` IPC; added `pendingStripeSessionId` and `stripeLocalServer` globals |
| `src/v3/components/BusinessHealth/BusinessHealthView.jsx` | Added `linkTimeoutRef`, `cancelLink()` helper, 10-min safety timeout, Cancel button in UI, `pendingSessionId` fallback in `onStripeAuthComplete` |
| `package.json` | Bumped to 2.4.1 |
| `version.json` | Bumped to 2.4.1 |
| `clear-ota-cache.command` | Updated version label to v2.4.1 |

---

## What Was Validated

- [x] React build compiles clean (`npm run build`)
- [x] DMG packages successfully (`npm run make`)
- [x] Desktop folder assembled: `AZ Photo Center v2.4.1/` with DMG + Install Helper + Cache Clear
- [x] Protocol `azphotoapp://` is registered in `package.json` forge config (Info.plist) — confirmed
- [x] `sessions.create` no longer includes invalid `return_url`
- [x] `shell.openExternal` is always reached (was never reached before this fix)
- [x] Cancel button renders correctly and calls `cancelLink()`
- [x] Timeout resets state after 10 minutes if completion never arrives
- [ ] Live Chase OAuth end-to-end — **requires live Stripe keys + real bank account to verify**

---

## Remaining Blocker

**Chase end-to-end validation requires live testing.**

**If it still doesn't work:**
1. Open Terminal, run `npm start` in the project directory
2. Click Link Account — check terminal for `[Stripe] Auth page ready at http://127.0.0.1:PORT/`
3. If that line appears, the browser should open. If Safari opens and shows a blank page, check the port number and try navigating to it manually.
4. Connect Bank in Safari. After Chase auth completes, the page should say "✓ Done! You can close this tab…"
5. The app window should come to the foreground with accounts loaded.
6. If Chase shows "something went wrong": confirm you're using **live keys** (`pk_live_` / `sk_live_`). Real bank accounts cannot be connected in test mode (`pk_test_`).
7. In Stripe Dashboard → Financial Connections → Settings, confirm Chase is enabled for your account.

---

## Architecture of the Working Flow

```
[Click Link Account]
  → stripe-create-link-session (main.js)
      → Stripe API: create FC session (no return_url)
      → returns { clientSecret, sessionId }
  → stripe-open-link-window (main.js)
      → Start local HTTP server on 127.0.0.1:RANDOM_PORT
      → shell.openExternal('http://127.0.0.1:PORT/') → Safari opens
      → Safari loads Stripe.js page with "Connect Bank" button
  → [10-min timeout starts in renderer]
  → [User clicks Connect Bank → Stripe.js popup/redirect → Chase OAuth]
  → [On success, page calls fetch('/done') to local server]
  → Local server /done handler (main.js)
      → sends stripe-auth-complete { sessionId } to renderer
      → focuses main window
  → onStripeAuthComplete listener (BusinessHealthView.jsx)
      → stripe-get-accounts({ sessionId })
      → updates bankAccounts in state
      → cancelLink() → isLinking=false, timeout cleared
```
