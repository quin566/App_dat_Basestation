const { app, BrowserWindow, net, ipcMain, dialog, protocol, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const Stripe = require('stripe');
const twilio = require('twilio');

const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

// Remote UI/Tax logic payload
const PAYLOAD_URL = 'https://raw.githubusercontent.com/quin566/App_dat_Basestation/main/latest.html';

// OTA Update System — packaged-app updates via GitHub zip (no git/DMG required)
const OTA_VERSION_URL = 'https://raw.githubusercontent.com/quin566/App_dat_Basestation/ota-release/version.json';
const OTA_ZIP_URL     = 'https://github.com/quin566/App_dat_Basestation/archive/refs/heads/ota-release.zip';
const OTA_ZIP_PREFIX  = 'App_dat_Basestation-ota-release'; // GitHub archive root folder name

// --- GMAIL IMAP/SMTP INTEGRATION ---
ipcMain.handle('fetch-inbox', async (event, creds) => {
  if (!creds || !creds.address || !creds.appPassword) return { success: false, error: "No credentials provided." };
  try {
    const config = {
      imap: {
        user: creds.address,
        password: creds.appPassword,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { servername: 'imap.gmail.com' }
      }
    };
    
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');
    
    const searchCriteria = ['ALL'];
    const fetchOptions = { bodies: [''], markSeen: false };
    
    let results = await connection.search(searchCriteria, fetchOptions);
    results = results.slice(-20).reverse(); // Last 20 emails
    
    const emails = [];
    for (let item of results) {
      const rawPayload = item.parts.find(p => p.which === '');
      const parsed = await simpleParser(rawPayload.body);
      emails.push({
        id: item.attributes.uid,
        messageId: parsed.messageId,
        references: parsed.references || [],
        subject: parsed.subject || '(No Subject)',
        from: parsed.from ? parsed.from.text : 'Unknown',
        fromEmail: parsed.from && parsed.from.value[0] ? parsed.from.value[0].address : '',
        date: parsed.date,
        text: parsed.text || ''
      });
    }
    
    await connection.end();
    return { success: true, emails };
  } catch (err) {
    console.error('IMAP Error:', err);
    return { success: false, error: err.message };
  }
});

const cp = require('node:child_process');
const util = require('node:util');
const execPromise = util.promisify(cp.exec);

ipcMain.handle('open-apple-mail-reply', async (event, payload) => {
  try {
    const { inReplyTo, body } = payload;
    if (!inReplyTo) return { success: false, error: "No Message-ID targeted." };
    
    // Apple Mail uses raw Message-IDs without angle brackets
    const cleanId = inReplyTo.replace(/[<>]/g, '');
    
    // Escape template body for AppleScript injection
    const escapedBody = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

    const script = `
tell application "Mail"
    try
        -- Tell Mail to natively search the Inbox for the specific thread
        set targetMessage to (first message of inbox whose message id is "${cleanId}")
        
        -- Spawn the reply draft window
        set theReply to reply targetMessage with opening window
        
        -- Inject the Template at the top while appending the original thread history below
        tell theReply
            set content to "${escapedBody}\\n\\n" & content
        end tell
        
        activate
        return "success"
    on error errMsg
        return errMsg
    end try
end tell
    `;

    const { stdout } = await execPromise(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    
    if (stdout.includes('success')) {
      return { success: true };
    } else {
      return { success: false, error: "Could not find that message in your local Apple Mail Inbox. Make sure Apple Mail is fully synced." };
    }
  } catch (err) {
    console.error('AppleScript Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-state', (event) => {
  const statePath = path.join(app.getPath('userData'), 'azphoto_store.json');
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read native state', e);
  }
  return {};
});

ipcMain.handle('set-state', (event, newState) => {
  const statePath = path.join(app.getPath('userData'), 'azphoto_store.json');
  try {
    fs.writeFileSync(statePath, JSON.stringify(newState, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to write native state', e);
    return false;
  }
});

// Universal API Proxy (Bypasses Frontend CORS for future Phase 7 integrations like Plaid/Stripe)
ipcMain.handle('fetch-proxy', async (event, { url, options }) => {
  try {
    const response = await fetch(url, options);
    const data = await response.text();
    let parsed;
    try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
    return { success: true, status: response.status, data: parsed };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// External Deep-Link Hijacker
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (err) {
    console.error('Failed to open external link: ', err);
    return false;
  }
});

// ─── Stripe Financial Connections ────────────────────────────────────────────

const getStripeClient = () => {
  const statePath = path.join(app.getPath('userData'), 'azphoto_store.json');
  let saved = {};
  try {
    if (fs.existsSync(statePath)) saved = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch (e) { /* ignore */ }
  const key = saved.stripeSecretKey;
  if (!key || (!key.startsWith('sk_live_') && !key.startsWith('sk_test_') && !key.startsWith('rk_live_') && !key.startsWith('rk_test_'))) {
    throw new Error('Stripe secret key not configured. Go to Settings → Stripe Integration.');
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
};

ipcMain.handle('stripe-create-link-session', async () => {
  try {
    const stripe = getStripeClient();
    const session = await stripe.financialConnections.sessions.create({
      account_holder: { type: 'account' },
      permissions: ['balances', 'transactions'],
      return_url: 'azphotoapp://stripe-return',
    });
    return { success: true, clientSecret: session.client_secret, sessionId: session.id };
  } catch (err) {
    console.error('[Stripe] create-link-session error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stripe-get-accounts', async (_event, { sessionId }) => {
  try {
    const stripe = getStripeClient();
    const session = await stripe.financialConnections.sessions.retrieve(sessionId);
    const accounts = [];
    for (const acct of (session.accounts?.data || [])) {
      let balance = null;
      try {
        const bal = await stripe.financialConnections.accounts.retrieveBalance(acct.id);
        balance = bal.cash?.available?.usd ?? null;
      } catch (e) { /* balance fetch optional */ }
      accounts.push({
        id: acct.id,
        institutionName: acct.institution_name || 'Bank',
        displayName: acct.display_name || acct.institution_name || 'Account',
        last4: acct.last4 || '••••',
        balance,
        linkedAt: Date.now(),
        status: 'active',
      });
    }
    return { success: true, accounts };
  } catch (err) {
    console.error('[Stripe] get-accounts error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stripe-sync-transactions', async (_event, { accountId, limit = 200 }) => {
  try {
    const stripe = getStripeClient();
    const list = await stripe.financialConnections.transactions.list({
      account: accountId,
      limit,
    });
    const transactions = list.data.map((txn) => ({
      id: txn.id,
      accountId,
      date: new Date(txn.transacted_at * 1000).toISOString().slice(0, 10),
      description: txn.description || '',
      // Stripe Financial Connections amounts are in cents, positive = credit, negative = debit
      amount: txn.amount,
      category: '',
      categoryOverride: false,
      source: 'stripe',
    }));
    return { success: true, transactions };
  } catch (err) {
    console.error('[Stripe] sync-transactions error:', err.message);
    return { success: false, error: err.message };
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// ─── Client File Storage ──────────────────────────────────────────────────────

ipcMain.handle('client-save-file', async (event, { clientId, filename, buffer }) => {
  const dir = path.join(app.getPath('userData'), 'clients', clientId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), Buffer.from(buffer));
  return { success: true, filePath: path.join(dir, filename) };
});

ipcMain.handle('client-read-file', async (event, { clientId, filename }) => {
  const filePath = path.join(app.getPath('userData'), 'clients', clientId, filename);
  const data = fs.readFileSync(filePath);
  return { success: true, data: data.toString('base64') };
});

ipcMain.handle('client-delete-file', async (event, { clientId, filename }) => {
  const filePath = path.join(app.getPath('userData'), 'clients', clientId, filename);
  fs.rmSync(filePath, { force: true });
  return { success: true };
});

ipcMain.handle('client-delete-folder', async (event, { clientId }) => {
  const dir = path.join(app.getPath('userData'), 'clients', clientId);
  fs.rmSync(dir, { recursive: true, force: true });
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────

const downloadPayload = async () => {
  return new Promise((resolve) => {
    try {
      const request = net.request(PAYLOAD_URL);
      request.setHeader('User-Agent', 'Electron/AZ-Command-Center');
      request.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      request.setHeader('Pragma', 'no-cache');
      let body = '';
      
      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          console.log(`Payload fetch failed with status: ${response.statusCode}`);
          resolve(false);
          return;
        }
        response.on('data', (chunk) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          const userDataPath = app.getPath('userData');
          const payloadPath = path.join(userDataPath, 'current_payload.html');
          try {
            fs.writeFileSync(payloadPath, body);
            resolve(true);
          } catch (e) {
            console.error('Failed to write downloaded payload to disk', e);
            resolve(false);
          }
        });
      });
      request.on('error', (error) => {
        console.error('Network error while downloading payload', error);
        resolve(false);
      });
      request.end();
    } catch (e) {
      console.error('Invalid URL or request setup failed');
      resolve(false);
    }
  });
};

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // Check GitHub every 3 minutes (legacy mode)
const V3_UPDATE_INTERVAL_MS = 20 * 60 * 1000; // Check git every 20 minutes (V3 mode)
let mainWindowRef = null;

const getLocalPayloadHash = () => {
  try {
    const userDataPath = app.getPath('userData');
    const payloadPath = path.join(userDataPath, 'current_payload.html');
    if (!fs.existsSync(payloadPath)) return null;
    const content = fs.readFileSync(payloadPath, 'utf8');
    // Use a simple length+last-200-chars fingerprint (no crypto needed)
    return `${content.length}::${content.slice(-200)}`;
  } catch (e) {
    return null;
  }
};

// Downloads a URL to a local file path as raw bytes (handles binary zip files)
const downloadToFile = (url, destPath) => new Promise((resolve, reject) => {
  const request = net.request(url);
  request.setHeader('User-Agent', 'Electron/AZ-Command-Center');
  const chunks = [];
  request.on('response', (response) => {
    if (response.statusCode !== 200) {
      reject(new Error(`Download failed: HTTP ${response.statusCode}`));
      return;
    }
    response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    response.on('end', () => {
      try {
        fs.writeFileSync(destPath, Buffer.concat(chunks));
        resolve();
      } catch (e) { reject(e); }
    });
  });
  request.on('error', reject);
  request.end();
});

const semverGt = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
};

const getOTAInstalledVersion = () => {
  try {
    const versionFile = path.join(app.getPath('userData'), 'ota_installed_version.json');
    if (fs.existsSync(versionFile)) return JSON.parse(fs.readFileSync(versionFile, 'utf8')).version;
  } catch (_) {}
  return require('./package.json').version;
};

const checkOTAUpdate = async () => {
  console.log('[OTA] Checking for remote update...');
  try {
    const res = await fetch(OTA_VERSION_URL, { headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Electron/AZ-Command-Center' } });
    if (!res.ok) throw new Error(`version.json fetch failed: HTTP ${res.status}`);
    const remote = await res.json();
    const localVersion = getOTAInstalledVersion();

    if (!semverGt(remote.version, localVersion)) {
      console.log(`[OTA] Up to date (${localVersion}).`);
      return;
    }
    console.log(`[OTA] Update available: ${localVersion} → ${remote.version}. Downloading...`);

    const userData   = app.getPath('userData');
    const zipPath    = path.join(userData, 'ota_update.zip');
    const extractDir = path.join(userData, 'ota_extract');
    const destDir    = path.join(userData, 'latest_v3');

    await downloadToFile(OTA_ZIP_URL, zipPath);
    console.log('[OTA] Zip downloaded. Extracting dist/v3...');

    fs.mkdirSync(extractDir, { recursive: true });
    await execPromise(`unzip -o "${zipPath}" -d "${extractDir}"`);

    const extractedV3 = path.join(extractDir, OTA_ZIP_PREFIX, 'dist', 'v3');
    if (!fs.existsSync(extractedV3)) throw new Error('dist/v3 not found in downloaded zip.');

    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    fs.renameSync(extractedV3, destDir);

    // Record installed version so next launch doesn't re-download
    fs.writeFileSync(path.join(userData, 'ota_installed_version.json'), JSON.stringify({ version: remote.version }));

    // Clean up temp files
    fs.rmSync(zipPath, { force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });

    console.log('[OTA] Installed. Relaunching...');
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Update Installed',
      message: `Version ${remote.version} has been installed. The app will now restart.`,
      buttons: ['Restart Now']
    });
    app.relaunch();
    app.exit(0);
  } catch (err) {
    console.error('[OTA] Error:', err.message);
  }
};

const checkForUpdates = async () => {
  console.log('[AutoUpdate] Checking GitHub for new version...');
  const success = await downloadPayload();
  if (!success) {
    console.log('[AutoUpdate] Could not reach GitHub. Staying on current version.');
    return;
  }
  // Always reload after a successful download to guarantee latest version
  console.log('[AutoUpdate] Downloaded latest version. Reloading window...');
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    const userDataPath = app.getPath('userData');
    const payloadPath = path.join(userDataPath, 'current_payload.html');
    mainWindowRef.loadFile(payloadPath);
  }
};

ipcMain.handle('trigger-git-update', async () => {
  if (app.isPackaged) { await checkOTAUpdate(); return { status: 'up-to-date' }; }
  try {
    await execPromise('git fetch', { cwd: __dirname });
    const { stdout: local } = await execPromise('git rev-parse HEAD', { cwd: __dirname });
    const { stdout: remote } = await execPromise('git rev-parse origin/main', { cwd: __dirname });
    if (local.trim() === remote.trim()) return { status: 'up-to-date' };
    // Notify renderer to show "installing" state before the long build
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('update-status', 'installing');
    }
    await execPromise('git pull origin main', { cwd: __dirname });
    await execPromise('npm run build', { cwd: __dirname });
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Update Applied',
      message: 'A new version has been downloaded and built. The app will now restart.',
      buttons: ['Restart Now']
    });
    app.relaunch();
    app.exit(0);
  } catch (err) {
    console.error('[V3 ManualUpdate] Error:', err.message);
    return { status: 'error', message: err.message };
  }
});

const checkV3Update = async () => {
  if (app.isPackaged) return; // Only runs from source; packaged builds update via DMG
  console.log('[V3 AutoUpdate] Fetching origin...');
  try {
    await execPromise('git fetch', { cwd: __dirname });
    const { stdout: local } = await execPromise('git rev-parse HEAD', { cwd: __dirname });
    const { stdout: remote } = await execPromise('git rev-parse origin/main', { cwd: __dirname });
    if (local.trim() === remote.trim()) {
      console.log('[V3 AutoUpdate] Already up to date.');
      return;
    }
    console.log('[V3 AutoUpdate] Update found — pulling...');
    await execPromise('git pull origin main', { cwd: __dirname });
    console.log('[V3 AutoUpdate] Rebuilding dist/v3...');
    await execPromise('npm run build', { cwd: __dirname });
    console.log('[V3 AutoUpdate] Build complete. Relaunching...');
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Update Applied',
      message: 'A new version has been downloaded and built. The app will now restart.',
      buttons: ['Restart Now']
    });
    app.relaunch();
    app.exit(0);
  } catch (err) {
    console.error('[V3 AutoUpdate] Error:', err.message);
  }
};

const isDev = !app.isPackaged;

// Returns the best available V3 index.html — OTA override takes priority over the built-in dist
const getV3LoadPath = () => {
  const otaPath = path.join(app.getPath('userData'), 'latest_v3', 'index.html');
  if (fs.existsSync(otaPath)) {
    console.log('[V3] OTA override active:', otaPath);
    return otaPath;
  }
  return path.join(__dirname, 'dist/v3/index.html');
};

// TOGGLE: Set to true to launch the new React foundation.
// Set to false to launch the legacy HTML version.
const V3_MODE = true;

const createWindow = async () => {
  mainWindowRef = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  if (V3_MODE) {
    // mainWindowRef.webContents.openDevTools();

    if (isDev) {
      console.log('[V3] Attempting Dev Mode: http://localhost:5173/');
      try {
        await mainWindowRef.loadURL('http://localhost:5173/');
      } catch (e) {
        console.log('[V3] Dev server not reachable, falling back to build...');
        const loadPath = getV3LoadPath();
        if (fs.existsSync(loadPath)) {
          mainWindowRef.loadFile(loadPath);
        } else {
          console.error('[V3] Error: No build found at', loadPath);
          mainWindowRef.loadFile('src/index.html'); // LAST RESORT
        }
      }
    } else {
      const loadPath = getV3LoadPath();
      console.log('[V3] Production Mode: Loading', loadPath);
      if (fs.existsSync(loadPath)) {
        mainWindowRef.loadFile(loadPath);
      } else {
        console.error('[V3] Error: No build found at', loadPath);
        mainWindowRef.loadFile('src/index.html');
      }
    }
  } else {
    console.log('[Legacy] Loading src/index.html');
    mainWindowRef.loadFile('src/index.html');
  }

  mainWindowRef.once('ready-to-show', () => {
    mainWindowRef.show();
  });

  // Kick off update check after a short delay so the window is fully ready
  setTimeout(() => {
    if (V3_MODE) {
      if (app.isPackaged) {
        // Packaged builds: OTA via GitHub zip (no git required)
        checkOTAUpdate();
        setInterval(checkOTAUpdate, V3_UPDATE_INTERVAL_MS);
        console.log(`[OTA] Daemon started. Checking every ${V3_UPDATE_INTERVAL_MS / 60000} minutes.`);
      } else {
        // Dev/source builds: git pull + rebuild
        checkV3Update();
        setInterval(checkV3Update, V3_UPDATE_INTERVAL_MS);
        console.log(`[V3 AutoUpdate] Daemon started. Checking every ${V3_UPDATE_INTERVAL_MS / 60000} minutes.`);
      }
    } else {
      checkForUpdates();
      setInterval(checkForUpdates, CHECK_INTERVAL_MS);
      console.log(`[AutoUpdate] Daemon started. Checking every ${CHECK_INTERVAL_MS / 60000} minutes.`);
    }
  }, 3000);
};

// ─── Twilio SMS Scheduler ─────────────────────────────────────────────────────

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

    const shootDate    = new Date(`${client.shootDate}T${client.shootTime || '08:00'}`);
    const threeDayMark = new Date(shootDate);
    threeDayMark.setDate(threeDayMark.getDate() - 3);

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

  if (dirty) {
    const storePath = path.join(app.getPath('userData'), 'azphoto_store.json');
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  }
}

// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Register azphotoapp:// deep-link so Stripe OAuth can return to the app
  app.setAsDefaultProtocolClient('azphotoapp');
  protocol.handle('azphotoapp', (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname === 'stripe-return') {
        const sessionId = url.searchParams.get('session_id');
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('stripe-auth-complete', { sessionId });
          mainWindowRef.focus();
        }
      }
    } catch (e) {
      console.error('[Protocol] azphotoapp handler error:', e.message);
    }
    return new Response('', { status: 200 });
  });

  createWindow();

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
  setInterval(runSmsCheck, 60 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
