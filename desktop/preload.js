const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reventDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
  sendNotification: (payload) => {
    ipcRenderer.send('desktop:show-notification', payload);
  },
  setBadgeCount: (count) => {
    ipcRenderer.send('desktop:set-badge', count);
  },
  onNavigate: (callback) => {
    ipcRenderer.on('desktop:navigate', (event, url) => callback(url));
  }
});
