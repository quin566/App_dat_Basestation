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
        tlsOptions: { rejectUnauthorized: false }
      }
    };
    
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');
    
    const searchCriteria = ['ALL'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true, markSeen: false };
    
    let results = await connection.search(searchCriteria, fetchOptions);
    results = results.slice(-20).reverse(); // Last 20 emails
    
    const emails = [];
    for (let item of results) {
      const all = item.parts.find(p => p.which === 'TEXT');
      const headerPart = item.parts.find(p => p.which === 'HEADER');
      const bodyStr = headerPart.body + (all ? all.body : '');
      const parsed = await simpleParser(bodyStr);
      emails.push({
        id: item.attributes.uid,
        messageId: parsed.messageId,
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

ipcMain.handle('send-reply', async (event, payload) => {
  try {
    const { creds, to, subject, body, inReplyTo } = payload;
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: creds.address,
        pass: creds.appPassword
      }
    });

    const mailOptions = {
      from: creds.address,
      to,
      subject,
      text: body,
      inReplyTo: inReplyTo,
      references: [inReplyTo]
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (err) {
    console.error('SMTP Error:', err);
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

const downloadPayload = async () => {
  return new Promise((resolve) => {
    try {
      const buster = '?t=' + Date.now();
      const request = net.request(PAYLOAD_URL + buster);
      request.setHeader('User-Agent', 'Electron/AZ-Command-Center');
      request.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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
