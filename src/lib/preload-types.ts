/**
 * preload-types.ts - TypeScript types cho Electron API được expose từ preload script
 *
 * Những types này định nghĩa interface của window.electronAPI
 * mà renderer process có thể truy cập một cách type-safe.
 */

// =============================================================================
// Shared Types (đã có trong ipc.ts, copy lại để preload-types độc lập)
// =============================================================================

export interface ReminderItem {
  id: string;
  text: string;
}

export interface ReminderNote {
  noteId: string;
  title: string;
  items: ReminderItem[];
}

// =============================================================================
// Electron API Interface (được expose từ preload.js)
// =============================================================================

export interface ElectronAPI {
  // ─── Renderer -> Main Process ────────────────────────────────────────────

  /**
   * Gửi task sync payload sang main process
   */
  sendTaskSync: (payload: ReminderNote[]) => void;

  /**
   * Gửi signal khi user click vào reminder để mở note
   */
  sendReminderClick: (noteId: string) => void;

  /**
   * Gửi signal khi user dismiss/hide reminder
   */
  sendReminderDismiss: () => void;

  // ─── Main Process -> Renderer ────────────────────────────────────────────

  /**
   * Lắng nghe reminder payload từ main process
   * @returns cleanup function để remove listener khi unmount
   */
  onShowReminder: (callback: (payload: ReminderNote) => void) => () => void;

  /**
   * Lắng nghe yêu cầu mở note từ main process
   * @returns cleanup function để remove listener khi unmount
   */
  onOpenNote: (callback: (noteId: string) => void) => () => void;
}

// =============================================================================
// Type Augmentation cho Window Interface
// =============================================================================

/**
 * Merge electronAPI vào Window interface để TypeScript biết
 * rằng window.electronAPI tồn tại và có đúng type
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Export empty object để make this file a module (required for ambient declarations)
export {};
