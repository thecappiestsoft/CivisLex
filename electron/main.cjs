/**
 * Opcjonalna powłoka desktopowa (Electron) dla CivisLex.
 * Uruchomienie: npm install && npm run desktop
 *
 * Aplikacja działa w pełni offline — ładuje index.html z katalogu głównego.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 380,
    title: 'CivisLex',
    icon: path.join(__dirname, '..', 'assets', 'favicon.svg'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));

  // Linki zewnętrzne otwieramy w przeglądarce systemowej.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
