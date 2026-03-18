const { app, BrowserWindow, net, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Remote UI/Tax logic payload
const PAYLOAD_URL = 'https://raw.githubusercontent.com/quin566/App_dat_Basestation/main/latest.html';

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
      const request = net.request(PAYLOAD_URL);
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
