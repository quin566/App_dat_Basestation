const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getState: () => ipcRenderer.invoke('get-state'),
  setState: (state) => ipcRenderer.invoke('set-state', state),
  fetchInbox: (creds) => ipcRenderer.invoke('fetch-inbox', creds),
  sendReply: (payload) => ipcRenderer.invoke('send-reply', payload)
});
