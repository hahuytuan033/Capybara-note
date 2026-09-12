/**
 * electron.ts - Electron API accessor
 *
 * Ưu tiên dùng preload API (window.electronAPI) nếu có,
 * fallback về legacy require() pattern cho development mode.
 */

import type { ElectronAPI } from './preload-types';

/**
 * Lấy Electron API từ preload bridge
 *
 * Preload API là cách recommended - type-safe và secure.
 * Legacy require() chỉ dùng trong dev mode khi không có preload.
 */
export function getElectron(): ElectronAPI | null {
  // Ưu tiên preload API (production-ready, secure)
  const preloadAPI = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  if (preloadAPI) {
    return preloadAPI;
  }

  // Legacy fallback: dùng require() trực tiếp (chỉ for dev/testing)
  // Production nên dùng preload API
  try {
    const w = window as unknown as {
      require?: (module: string) => unknown;
    };
    if (typeof w.require === 'function') {
      const electron = w.require('electron') as { ipcRenderer?: LegacyElectronHandle['ipcRenderer'] };
      if (electron && electron.ipcRenderer) {
        console.warn('[electron] Using legacy require() - consider migrating to preload API');
        return createLegacyBridge(electron.ipcRenderer);
      }
    }
  } catch {
    /* not running inside Electron */
  }

  return null;
}

// Legacy types để tương thích ngược
interface LegacyElectronHandle {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, listener: (...args: unknown[]) => void) => void;
    removeListener: (channel: string, listener: (...args: unknown[]) => void) => void;
  };
}

/**
 * Tạo preload-style API bridge từ legacy ipcRenderer
 * Giúp code cũ vẫn hoạt động trong dev mode
 */
function createLegacyBridge(ipcRenderer: LegacyElectronHandle['ipcRenderer']): ElectronAPI {
  return {
    sendTaskSync: (payload) => ipcRenderer.send('capnote:sync-tasks', payload),
    sendReminderClick: (noteId) => ipcRenderer.send('capnote:reminder-click', noteId),
    sendReminderDismiss: () => ipcRenderer.send('capnote:reminder-dismiss'),

    onShowReminder: (callback) => {
      const handler = (_event: unknown, payload: unknown) => callback(payload as never);
      ipcRenderer.on('capnote:show-reminder', handler);
      return () => ipcRenderer.removeListener('capnote:show-reminder', handler);
    },

    onOpenNote: (callback) => {
      const handler = (_event: unknown, noteId: unknown) => callback(noteId as string);
      ipcRenderer.on('capnote:open-note', handler);
      return () => ipcRenderer.removeListener('capnote:open-note', handler);
    },
  };
}

// Re-export types cho convenience
export type { ElectronAPI } from './preload-types';
