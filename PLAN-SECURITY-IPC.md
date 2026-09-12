# Plan: Cải thiện Security & Type Safety cho CapNote

## Context

### Tại sao cần thay đổi?

1. **Security Issue (P0)**: Hiện tại dùng `nodeIntegration: true` và `contextIsolation: false` - renderer process có full access đến Node.js APIs. Đây là security risk lớn.

2. **Type Safety Issue (P1)**: IPC channels được định nghĩa duplicate ở 2 nơi (`electron-main.js` và `src/lib/ipc.ts`), có thể drift theo thời gian. Payload types không được validate.

---

## Approach

### Security: Dùng Preload Script với Context Bridge

Thay vì expose toàn bộ Node.js vào renderer, ta sẽ:
1. Tạo `preload.js` - chạy trong isolated context
2. Dùng `contextBridge.exposeInMainWorld` để expose chỉ những API cần thiết
3. Renderer giao tiếp qua these exposed APIs thay vì trực tiếp `require('electron')`

### Type Safety: Shared Types + Validation

1. Giữ `src/lib/ipc.ts` là single source of truth cho IPC channels
2. Thêm Zod (hoặc simple validation) để validate IPC payloads ở main process
3. Type-safe API exposure qua preload

---

## Files cần thay đổi

### 1. Tạo mới: `preload.js` (Electron root)

```javascript
// preload.js - exposed APIs cho renderer
import { contextBridge, ipcRenderer } from 'electron';

// Validate channel names against allowed list
const VALID_CHANNELS = {
  send: ['capnote:sync-tasks'],
  receive: ['capnote:show-reminder', 'capnote:open-note'],
};

contextBridge.exposeInMainWorld('electronAPI', {
  // Send (renderer -> main)
  sendTaskSync: (payload) => {
    ipcRenderer.send('capnote:sync-tasks', payload);
  },

  // Receive (main -> renderer)
  onShowReminder: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('capnote:show-reminder', handler);
    return () => ipcRenderer.removeListener('capnote:show-reminder', handler);
  },

  onOpenNote: (callback) => {
    const handler = (_event, noteId) => callback(noteId);
    ipcRenderer.on('capnote:open-note', handler);
    return () => ipcRenderer.removeListener('capnote:open-note', handler);
  },
});
```

### 2. Tạo mới: `src/lib/preload-types.ts`

```typescript
// Type definitions cho API được expose từ preload
export interface ElectronAPI {
  sendTaskSync: (payload: ReminderNote[]) => void;
  onShowReminder: (callback: (payload: ReminderNote) => void) => () => void;
  onOpenNote: (callback: (noteId: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

### 3. Cập nhật: `electron-main.js`

**Thay đổi webPreferences:**
```javascript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, 'preload.js'),
  backgroundThrottling: true,
}
```

**Thêm IPC validation (cho SYNC_TASKS):**
```javascript
// Validate payload structure
function validateReminderNote(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.noteId !== 'string') return false;
  if (typeof data.title !== 'string') return false;
  if (!Array.isArray(data.items)) return false;
  return data.items.every(item =>
    typeof item.id === 'string' && typeof item.text === 'string'
  );
}

ipcMain.on(IPC.SYNC_TASKS, (event, payload) => {
  // Validate
  if (!Array.isArray(payload)) {
    console.warn('[reminder] SYNC_TASKS: invalid payload type');
    return;
  }
  const validTasks = payload.filter(validateReminderNote);
  pendingTasks = validTasks;
  // ... rest of logic
});
```

### 4. Cập nhật: `src/lib/electron.ts`

```typescript
// Thay vì dùng require('electron'), dùng exposed API từ preload
export function getElectron(): ElectronAPI | null {
  const api = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  return api ?? null;
}
```

### 5. Cập nhật: `src/App.tsx`

```typescript
// Before
const electron = getElectron();
electron.ipcRenderer.send(IPC.SYNC_TASKS, pendingTasksPayload);

// After
const electron = getElectron();
electron.sendTaskSync(pendingTasksPayload);

// Before (listener)
electron.ipcRenderer.on(IPC.OPEN_NOTE, handler);

// After
const cleanup = electron.onOpenNote((noteId) => {
  setActiveNoteId(noteId);
});
// cleanup trong useEffect return
```

### 6. Cập nhật: `src/components/TaskReminder.tsx`

```typescript
// Before
const handle = electron.current;
handle.ipcRenderer.on(IPC.SHOW_REMINDER, onShow);

// After
useEffect(() => {
  const cleanup = electron.onShowReminder(onShow);
  return cleanup;
}, []);
```

### 7. Cập nhật: `package.json`

```json
"build": {
  "files": [
    "dist/**/*",
    "electron-main.js",
    "preload.js",
    "src/assets/images/favicon.ico"
  ]
}
```

---

## Verification

1. **Security Check**:
   ```bash
   # Trong DevTools của Electron, thử:
   require('electron')  // Should be undefined
   window.require     // Should be undefined
   window.electronAPI  // Should have only exposed methods
   ```

2. **Functionality Check**:
   - Tạo note → task sync sang main process ✓
   - Thu nhỏ app → reminder hiện lên ✓
   - Click reminder → mở note đúng ✓

3. **Type Check**:
   ```bash
   npm run lint  # Should pass without errors
   ```

4. **Build Check**:
   ```bash
   npm run electron:build
   # Check release folder có preload.js
   ```

---

## Migration Path

Để không break existing functionality:

1. **Phase 1**: Tạo preload.js + validate main process (backward compatible)
2. **Phase 2**: Update renderer để dùng new API
3. **Phase 3**: Remove old electron.ts pattern hoàn toàn

Hoặc có thể giữ cả 2 patterns trong `electron.ts`:
```typescript
export function getElectron(): ElectronAPI | ElectronHandle | null {
  // Thử preload API trước
  const preloadAPI = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  if (preloadAPI) return preloadAPI;

  // Fallback về old require() pattern (dev mode)
  return getElectronLegacy();
}
```

---

## Estimated Effort

| Task | Effort | Risk |
|------|--------|------|
| Tạo preload.js | 30 min | Low |
| Cập nhật electron-main.js | 20 min | Medium |
| Cập nhật electron.ts | 15 min | Low |
| Cập nhật App.tsx | 20 min | Low |
| Cập nhật TaskReminder.tsx | 15 min | Low |
| Update package.json | 5 min | Low |
| Testing | 30 min | - |
| **Total** | ~2.5 hours | - |
