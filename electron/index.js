const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Desativa a política COOP no Chromium para permitir que os popups de login funcionem no Electron
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Intercepta e remove cabeçalhos COOP para permitir comunicação do popup de login com o Electron
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // Remove o cabeçalho COOP de forma case-insensitive
    const coopKeys = Object.keys(responseHeaders).filter(k => k.toLowerCase() === 'cross-origin-opener-policy');
    coopKeys.forEach(k => delete responseHeaders[k]);
    callback({ cancel: false, responseHeaders });
  });

  // Tenta carregar o URL do Vite (Dev)
  // Se falhar, tenta carregar o ficheiro local (Prod)
  win.loadURL('http://localhost:5173').catch(() => {
      win.loadFile(path.join(__dirname, 'app/index.html'));
  });
}

// Handler para seleção nativa de pastas
ipcMain.handle('select-directory', async (event) => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });
  return result.filePaths[0]; // Retorna o caminho da pasta ou undefined
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});