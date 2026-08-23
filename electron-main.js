import { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Giới hạn RAM cho V8 Engine (Khoảng 256MB) để tránh Electron ngốn quá mức
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');

// ======================= CẤU HÌNH REMINDER =======================
const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5 phút giữa các lần nhắc
const REMINDER_INITIAL_DELAY_MS = 5 * 1000; // lần nhắc đầu sau khi thu nhỏ (nhanh để dễ thấy)
const REMINDER_VISIBLE_MS = 10 * 1000;      // tự ẩn sau 10 giây
const REMINDER_WIDTH = 300;
const REMINDER_HEIGHT = 200;
const REMINDER_MARGIN = 16; // khoảng cách tới cạnh màn hình

// IPC channels (phải khớp với src/lib/ipc.ts)
const IPC = {
  SYNC_TASKS: 'capnote:sync-tasks',
  SHOW_REMINDER: 'capnote:show-reminder',
  REMINDER_CLICK: 'capnote:reminder-click',
  REMINDER_DISMISS: 'capnote:reminder-dismiss',
  OPEN_NOTE: 'capnote:open-note',
};
// ================================================================

let win = null;
let tray = null;
let reminderWindow = null;

// Snapshot các task pending từ renderer (cập nhật qua IPC.SYNC_TASKS)
let pendingTasks = [];
// Timer hiển thị reminder định kỳ (chỉ active khi cửa sổ chính ẩn)
let reminderTimer = null;
// Timer cho lần nhắc đầu tiên (chạy sớm sau khi thu nhỏ, trước chu kỳ định kỳ)
let reminderInitialTimer = null;
// Timer tự ẩn reminder sau REMINDER_VISIBLE_MS
let reminderHideTimer = null;
// Round-robin index giữa các note để không luôn nhắc note đầu
let lastReminderNoteIndex = -1;
// Payload đang chờ gửi vào reminder window (đợi did-finish-load nếu cần)
let reminderPendingPayload = null;

function hasPendingTasks() {
  return Array.isArray(pendingTasks) && pendingTasks.length > 0;
}

function isMainWindowHidden() {
  // "Vắng mặt" = cửa sổ bị ẩn (về tray) HOẶC bị thu nhỏ xuống taskbar.
  return !win || !win.isVisible() || win.isMinimized();
}

function positionReminderWindow(rw) {
  const { workArea } = screen.getPrimaryDisplay();
  const x = workArea.x + workArea.width - REMINDER_WIDTH - REMINDER_MARGIN;
  const y = workArea.y + workArea.height - REMINDER_HEIGHT - REMINDER_MARGIN;
  rw.setPosition(Math.round(x), Math.round(y));
}

function createReminderWindow() {
  if (reminderWindow) return reminderWindow;

  reminderWindow = new BrowserWindow({
    width: REMINDER_WIDTH,
    height: REMINDER_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: true,
    }
  });

  reminderWindow.on('closed', () => {
    reminderWindow = null;
  });

  // Sau khi renderer load xong mới gửi payload (tránh mất message trước khi listener đăng ký)
  reminderWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.log('[reminder] did-fail-load code=%d desc=%s url=%s', code, desc, url);
  });

  reminderWindow.once('did-finish-load', () => {
    console.log('[reminder] reminder window did-finish-load');
    if (reminderPendingPayload && reminderWindow && !reminderWindow.isVisible()) {
      deliverReminderPayload();
    }
  });

  if (app.isPackaged) {
    reminderWindow.loadFile(path.join(__dirname, 'dist', 'index.html'), { hash: 'reminder' });
  } else {
    reminderWindow.loadURL('http://localhost:3000#reminder');
  }

  return reminderWindow;
}

// Chọn một note để nhắc theo round-robin
function pickReminderPayload() {
  if (!hasPendingTasks()) return null;
  lastReminderNoteIndex = (lastReminderNoteIndex + 1) % pendingTasks.length;
  const note = pendingTasks[lastReminderNoteIndex];
  return { noteId: note.noteId, title: note.title, items: note.items };
}

function hideReminder() {
  if (reminderHideTimer) {
    clearTimeout(reminderHideTimer);
    reminderHideTimer = null;
  }
  // Hủy hẳn cửa sổ (thay vì chỉ hide) để giải phóng cả một renderer process khi
  // rảnh. showReminder()/createReminderWindow() sẽ tạo lại khi cần lần sau.
  if (reminderWindow) {
    reminderWindow.destroy();
    reminderWindow = null;
  }
}

function deliverReminderPayload() {
  if (!reminderWindow || !reminderPendingPayload) {
    console.log('[reminder] deliver skipped: win=%s payload=%s', !!reminderWindow, !!reminderPendingPayload);
    return;
  }

  console.log('[reminder] delivering payload + showing window');
  reminderWindow.webContents.send(IPC.SHOW_REMINDER, reminderPendingPayload);

  if (!reminderWindow.isVisible()) {
    positionReminderWindow(reminderWindow);
    reminderWindow.show();
  }

  if (reminderHideTimer) clearTimeout(reminderHideTimer);
  reminderHideTimer = setTimeout(() => hideReminder(), REMINDER_VISIBLE_MS);
}

function showReminder() {
  if (!reminderWindow) createReminderWindow();
  const payload = pickReminderPayload();
  if (!payload) {
    console.log('[reminder] showReminder: no payload picked');
    return;
  }

  reminderPendingPayload = payload;
  const loading = reminderWindow.webContents && reminderWindow.webContents.isLoading();
  console.log('[reminder] showReminder: note="%s" loading=%s', payload.title, loading);

  // Nếu renderer đã load xong thì gửi ngay, ngược lại did-finish-load sẽ gửi
  if (reminderWindow.webContents && !loading) {
    deliverReminderPayload();
  }
}

function stopScheduler() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
  if (reminderInitialTimer) {
    clearTimeout(reminderInitialTimer);
    reminderInitialTimer = null;
  }
}

function startScheduler() {
  stopScheduler();
  console.log('[reminder] startScheduler: pending=%d hidden=%s', pendingTasks.length, isMainWindowHidden());
  if (hasPendingTasks() && isMainWindowHidden()) {
    // Nhắc lần đầu sớm (REMINDER_INITIAL_DELAY_MS) để reminder xuất hiện ngay sau
    // khi thu nhỏ, sau đó lặp lại mỗi REMINDER_INTERVAL_MS.
    reminderInitialTimer = setTimeout(() => {
      reminderInitialTimer = null;
      tryShowReminder();
    }, REMINDER_INITIAL_DELAY_MS);
    reminderTimer = setInterval(tryShowReminder, REMINDER_INTERVAL_MS);
    console.log('[reminder] scheduler armed (initial %dms, interval %dms)', REMINDER_INITIAL_DELAY_MS, REMINDER_INTERVAL_MS);
  } else {
    console.log('[reminder] scheduler NOT armed');
  }
}

function tryShowReminder() {
  console.log('[reminder] tryShowReminder: pending=%d hidden=%s', pendingTasks.length, isMainWindowHidden());
  if (!isMainWindowHidden() || !hasPendingTasks()) {
    stopScheduler();
    hideReminder();
    return;
  }
  // Nếu reminder hiện tại vẫn đang hiển thị, bỏ qua lần này
  if (reminderWindow && reminderWindow.isVisible()) return;
  showReminder();
}

function createWindow() {
  win = new BrowserWindow({
    width: 500,
    height: 800,
    title: "CapNote",
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    icon: path.join(__dirname, 'src', 'assets', 'images', 'favicon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Throttle timers/animation in backgrounded windows to cut idle RAM/CPU
      backgroundThrottling: true,
    }
  });

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  // Thu nhỏ giữ nguyên hành vi mặc định (app vẫn nằm ở taskbar), chỉ bắt đầu
  // lịch trình reminder vì lúc này người dùng không nhìn cửa sổ chính.
  win.on('minimize', () => {
    startScheduler();
  });

  // Bỏ thu nhỏ (khôi phục từ taskbar) -> dừng lịch trình và ẩn reminder
  win.on('restore', () => {
    stopScheduler();
    hideReminder();
  });

  // Khi cửa sổ chính ẩn (bấm X -> thu về tray) -> bắt đầu lịch trình reminder
  win.on('hide', () => {
    startScheduler();
  });

  // Khi cửa sổ chính hiện lại (từ tray) -> dừng lịch trình và ẩn reminder
  win.on('show', () => {
    stopScheduler();
    hideReminder();
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
    { label: 'Mở CapNote', click: () => { if (win) win.show(); } },
    { label: 'Thoát', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  
  tray.setToolTip('CapNote');
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
  registerIpc();
});

function registerIpc() {
  // Đăng ký một lần duy nhất để tránh trùng listener sau HMR/reload
  if (registerIpc.registered) return;
  registerIpc.registered = true;

  ipcMain.on(IPC.SYNC_TASKS, (event, payload) => {
    pendingTasks = Array.isArray(payload) ? payload : [];
    console.log('[reminder] SYNC_TASKS received: %d note(s) with pending items', pendingTasks.length);
    if (hasPendingTasks() && isMainWindowHidden()) {
      startScheduler();
    } else {
      stopScheduler();
      hideReminder();
    }
  });

  ipcMain.on(IPC.REMINDER_DISMISS, () => {
    hideReminder();
  });
}

app.on('before-quit', () => {
  stopScheduler();
  if (reminderHideTimer) {
    clearTimeout(reminderHideTimer);
    reminderHideTimer = null;
  }
  if (reminderWindow) {
    reminderWindow.destroy();
    reminderWindow = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
