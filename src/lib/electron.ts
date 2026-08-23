// Safe accessor for the Electron `ipcRenderer` from a renderer process.
// The app also runs in a plain Vite browser preview where `require('electron')`
// is unavailable; in that case this returns null so feature code can no-op.
export interface ElectronHandle {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, listener: (...args: unknown[]) => void) => void;
    removeListener: (channel: string, listener: (...args: unknown[]) => void) => void;
  };
}

export function getElectron(): ElectronHandle | null {
  try {
    const w = window as unknown as {
      require?: (module: string) => unknown;
    };
    if (typeof w.require === 'function') {
      const electron = w.require('electron') as { ipcRenderer?: ElectronHandle['ipcRenderer'] };
      if (electron && electron.ipcRenderer) {
        return { ipcRenderer: electron.ipcRenderer };
      }
    }
  } catch {
    /* not running inside Electron */
  }
  return null;
}
