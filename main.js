const { app, BrowserWindow, net, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

// Remote UI/Tax logic payload
const PAYLOAD_URL = 'https://raw.githubusercontent.com/quin566/App_dat_Basestation/main/latest.html';

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
    const { shell } = require('electron');
    await shell.openExternal(url);
    return true;
  } catch (err) {
    console.error('Failed to open external link: ', err);
    return false;
  }
});

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
  if (app.isPackaged) return { status: 'unavailable' };
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

// TOGGLE: Set to true to launch the new React foundation. 
// Set to false to launch the legacy HTML version.
const V3_MODE = true; 

const createWindow = async () => {
  mainWindowRef = new BrowserWindow({
    width: 1280,
    height: 800,
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
        console.log('[V3] Dev server not reachable, falling back to production build...');
        const prodPath = path.join(__dirname, 'dist/v3/index.html');
        if (fs.existsSync(prodPath)) {
          mainWindowRef.loadFile(prodPath);
        } else {
          console.error('[V3] Error: Production build missing at', prodPath);
          mainWindowRef.loadFile('src/index.html'); // LAST RESORT
        }
      }
    } else {
      const prodPath = path.join(__dirname, 'dist/v3/index.html');
      console.log('[V3] Production Mode: Loading', prodPath);
      if (fs.existsSync(prodPath)) {
        mainWindowRef.loadFile(prodPath);
      } else {
        console.error('[V3] Error: Production build missing at', prodPath);
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
      checkV3Update();
      setInterval(checkV3Update, V3_UPDATE_INTERVAL_MS);
      console.log(`[V3 AutoUpdate] Daemon started. Checking every ${V3_UPDATE_INTERVAL_MS / 60000} minutes.`);
    } else {
      checkForUpdates();
      setInterval(checkForUpdates, CHECK_INTERVAL_MS);
      console.log(`[AutoUpdate] Daemon started. Checking every ${CHECK_INTERVAL_MS / 60000} minutes.`);
    }
  }, 3000);
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
