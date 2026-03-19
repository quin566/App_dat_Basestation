const { app, BrowserWindow, net, ipcMain } = require('electron');
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

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const payloadSuccess = await downloadPayload();
  const userDataPath = app.getPath('userData');
  const payloadPath = path.join(userDataPath, 'current_payload.html');

  if (payloadSuccess && fs.existsSync(payloadPath)) {
    console.log('Launch path: Loading dynamic payload from userData');
    mainWindow.loadFile(payloadPath);
  } else if (fs.existsSync(payloadPath)) {
    console.log('Launch path: Loading CACHED dynamic payload (offline/failed update)');
    mainWindow.loadFile(payloadPath);
  } else {
    console.log('Launch path: Loading baseline static local payload');
    mainWindow.loadFile('src/index.html');
  }
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
