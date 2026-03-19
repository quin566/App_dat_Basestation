const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getState: () => ipcRenderer.invoke('get-state'),
  setState: (state) => ipcRenderer.invoke('set-state', state),
  fetchInbox: (creds) => ipcRenderer.invoke('fetch-inbox', creds),
  openAppleMailReply: (payload) => ipcRenderer.invoke('open-apple-mail-reply', payload),
  fetchProxy: (payload) => ipcRenderer.invoke('fetch-proxy', payload),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
