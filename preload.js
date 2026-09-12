/**
 * preload.js - Secure bridge between main process and renderer
 *
 * Chạy trong isolated context với quyền truy cập hạn chế.
 * Chỉ expose những APIs cần thiết thông qua contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

// =============================================================================
// TYPE DEFINITIONS (để tham khảo - không enforce ở đây vì preload không có TS)
// =============================================================================
//
// interface ReminderItem {
//   id: string;
//   text: string;
// }
//
// interface ReminderNote {
//   noteId: string;
//   title: string;
//   items: ReminderItem[];
// }
//
// interface ElectronAPI {
//   sendTaskSync: (payload: ReminderNote[]) => void;
//   onShowReminder: (callback: (payload: ReminderNote) => void) => () => void;
//   onOpenNote: (callback: (noteId: string) => void) => () => void;
//   sendReminderDismiss: () => void;
//   sendReminderClick: (noteId: string) => void;
// }

// =============================================================================
// API EXPOSURE
// =============================================================================

/**
 * Expose type-safe APIs cho renderer process
 * Renderer chỉ có thể truy cập những methods được list ở đây
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Renderer -> Main Process ────────────────────────────────────────────────

  /**
   * Gửi task sync payload sang main process
   * @param {Array} payload - Array of ReminderNote objects
   */
  sendTaskSync: (payload) => {
    ipcRenderer.send('capnote:sync-tasks', payload);
  },

  /**
   * Gửi signal khi user click vào reminder
   * @param {string} noteId - ID của note được click
   */
  sendReminderClick: (noteId) => {
    ipcRenderer.send('capnote:reminder-click', noteId);
  },

  /**
   * Gửi signal khi user dismiss reminder
   */
  sendReminderDismiss: () => {
    ipcRenderer.send('capnote:reminder-dismiss');
  },

  // ─── Main Process -> Renderer ───────────────────────────────────────────────

  /**
   * Lắng nghe khi main process gửi reminder payload
   * @param {Function} callback - (payload: ReminderNote) => void
   * @returns {Function} - cleanup function để remove listener
   */
  onShowReminder: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('capnote:show-reminder', handler);
    return () => ipcRenderer.removeListener('capnote:show-reminder', handler);
  },

  /**
   * Lắng nghe khi cần mở một note cụ thể (từ reminder click)
   * @param {Function} callback - (noteId: string) => void
   * @returns {Function} - cleanup function để remove listener
   */
  onOpenNote: (callback) => {
    const handler = (_event, noteId) => callback(noteId);
    ipcRenderer.on('capnote:open-note', handler);
    return () => ipcRenderer.removeListener('capnote:open-note', handler);
  },
});

console.log('[preload] Electron API bridge initialized');
