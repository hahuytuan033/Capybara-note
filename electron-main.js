import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Giới hạn RAM cho V8 Engine (Khoảng 256MB) để tránh Electron ngốn quá mức
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');

let win = null;
let tray = null;

function createWindow() {
  win = new BrowserWindow({
    width: 500,
    height: 800,
    title: "Capybara Note",
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    icon: path.join(__dirname, 'src', 'assets', 'images', 'favicon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  // Nếu đang build thì đọc từ file index.html sinh ra bởi Vite
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    // Nếu đang viết code/dev thì load từ server mặc định của Vite
    win.loadURL('http://localhost:3000');
  }
}

function createTray() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'images', 'favicon.ico');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mở Capybara Note', click: () => { if (win) win.show(); } },
    { label: 'Thoát', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  
  tray.setToolTip('Capybara Note');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (win && win.isVisible()) {
      win.hide();
    } else if (win) {
      win.show();
    } else {
      createWindow();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
