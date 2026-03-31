import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 400, // Kích thước này đủ sát với cái khung app UI (360x600) của bạn
    height: 700,
    title: "Capybara Note",
    autoHideMenuBar: true, // Tắt thanh menu File, Edit.. rườm rà ở phía trên đi
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit(); // Đóng hẳn app khi người dùng bấm dấu X
});
