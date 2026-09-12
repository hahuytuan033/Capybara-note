/**
 * useKeyboardShortcuts.ts - Custom hook cho keyboard shortcuts
 *
 * Các shortcuts:
 * - Ctrl/Cmd + N: Tạo note mới
 * - Escape: Đóng modal
 * - Ctrl/Cmd + Delete: Xóa note đang active
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onAddNote: () => void;
  onCloseModal: () => void;
  onDeleteActiveNote: (() => void) | null;
  isModalOpen: boolean;
}

export function useKeyboardShortcuts({
  onAddNote,
  onCloseModal,
  onDeleteActiveNote,
  isModalOpen,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + N: Tạo note mới (luôn available)
      if (modifier && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onAddNote();
        return;
      }

      // Escape: Đóng modal (chỉ khi modal đang mở)
      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        onCloseModal();
        return;
      }

      // Ctrl/Cmd + Delete/Backspace: Xóa note đang active (chỉ khi modal mở)
      if (modifier && (e.key === 'Delete' || e.key === 'Backspace') && isModalOpen && onDeleteActiveNote) {
        // Don't trigger if user is typing in textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
          // Don't interfere with text editing - let user delete text normally
          return;
        }
        e.preventDefault();
        onDeleteActiveNote();
        return;
      }
    },
    [onAddNote, onCloseModal, onDeleteActiveNote, isModalOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
