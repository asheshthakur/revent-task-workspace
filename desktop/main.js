const { app, BrowserWindow, Notification, ipcMain, shell, Menu, Tray } = require('electron');
const path = require('path');

// Determine target server URL:
// In development, you can run VEYA_URL=http://localhost:3000 npm start
// In production, defaults to the canonical VEYA application URL or live fallback
const TARGET_URL = process.env.VEYA_URL || process.env.REVENT_URL || 'https://app.veya.com';
const FALLBACK_URL = 'https://revent-task-workspace.revent-workspace.workers.dev';

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'VEYA',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL(TARGET_URL).catch((err) => {
    console.warn(`Failed to connect to ${TARGET_URL}: ${err.message}. Retrying fallback URL ${FALLBACK_URL}...`);
    mainWindow.loadURL(FALLBACK_URL).catch((fallbackErr) => {
      console.error(`Failed to load fallback URL: ${fallbackErr.message}`);
    });
  });

  // Handle external links (e.g. Google Drive, Figma, Docs) by opening them in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes(new URL(TARGET_URL).hostname) && !url.includes('localhost')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handler for desktop native notifications
ipcMain.on('desktop:show-notification', (event, { title, body, url }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || 'Revent Task Workspace',
      body: body || '',
      silent: false,
    });

    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        if (url) {
          mainWindow.webContents.send('desktop:navigate', url);
        }
      }
    });

    notification.show();
  }
});

// Set badge count for dock/taskbar
ipcMain.on('desktop:set-badge', (event, count) => {
  if (app.dock) {
    app.dock.setBadge(count > 0 ? String(count) : '');
  } else if (process.platform === 'win32') {
    // Windows overlay icon / flash frame if unread
    if (mainWindow && count > 0) {
      mainWindow.flashFrame(true);
    }
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
