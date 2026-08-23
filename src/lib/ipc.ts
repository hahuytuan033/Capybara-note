// Shared IPC channel names between Electron main process and renderers.
// Keep these in sync with the duplicated constants in electron-main.js.
export const IPC = {
  // Renderer (main window) -> Main process: latest pending-task snapshot
  SYNC_TASKS: 'capnote:sync-tasks',
  // Main process -> Reminder window: reminder payload to display
  SHOW_REMINDER: 'capnote:show-reminder',
  // Reminder window -> Main process: user clicked the reminder (with noteId)
  REMINDER_CLICK: 'capnote:reminder-click',
  // Reminder window -> Main process: user dismissed (closed) the reminder
  REMINDER_DISMISS: 'capnote:reminder-dismiss',
  // Main process -> Main renderer: open the note modal for noteId
  OPEN_NOTE: 'capnote:open-note',
} as const;

export interface ReminderItem {
  id: string;
  text: string;
}

export interface ReminderNote {
  noteId: string;
  title: string;
  items: ReminderItem[];
}
