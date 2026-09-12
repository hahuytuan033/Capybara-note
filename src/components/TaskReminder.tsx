import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { type ReminderNote } from '../lib/ipc';
import { getElectron } from '../lib/electron';
import '../lib/preload-types'; // Ensure Window.electronAPI types are available

// ============================================================================
// 🐹 BOUNDARY TÍCH HỢP ASSET NHÂN VẬT:
// User chưa cung cấp asset reminder. Khi có, đặt file vào đường dẫn bên dưới
// (src/assets/images/reminder_character.png) — glob sẽ tự động tìm và dùng,
// không cần sửa code. Nếu chưa có file, component hiển thị placeholder 🐹.
// ============================================================================
const REMINDER_CHARACTER_GLOB = import.meta.glob(
  '../assets/images/reminder_character.png',
  { import: 'default', eager: true }
) as Record<string, string>;

const REMINDER_CHARACTER_URL: string | null =
  Object.values(REMINDER_CHARACTER_GLOB)[0] ?? null;

const MAX_VISIBLE_ITEMS = 4;

export const TaskReminder: React.FC = () => {
  const [note, setNote] = useState<ReminderNote | null>(null);
  const electron = getElectron();

  // Lắng nghe reminder payload từ main process
  useEffect(() => {
    if (!electron) return;
    return electron.onShowReminder((payload) => {
      setNote(payload);
    });
  }, [electron]);

  const handleClick = () => {
    if (!note || !electron) return;
    electron.sendReminderClick(note.noteId);
  };

  const visibleItems = note ? note.items.slice(0, MAX_VISIBLE_ITEMS) : [];
  const hiddenCount = note ? Math.max(0, note.items.length - MAX_VISIBLE_ITEMS) : 0;

  // Reminder window phải trong suốt: ghi đè background của body (mặc định beige)
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = 'transparent';
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  return (
    <div
      onClick={handleClick}
      className="fixed inset-0 flex items-end justify-end p-4 cursor-pointer select-none"
      style={{ background: 'transparent' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative flex items-end gap-2 pointer-events-none"
      >
        {/* Phần nội dung task */}
        <div className="mb-2 w-[200px] rounded-3xl bg-[#fdf2d5]/95 shadow-2xl border-2 border-[#a06e45] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-[#3b4d9b] text-sm leading-tight break-words flex-1 min-w-0">
              {note?.title || 'Nhắc nhở'}
            </h3>
            <X
              size={14}
              className="text-[#a06e45] shrink-0 mt-0.5 opacity-60"
              onClick={(e) => {
                e.stopPropagation();
                if (electron) electron.sendReminderDismiss();
              }}
            />
          </div>

          <div className="mt-2 flex flex-col gap-1">
            {visibleItems.map((item) => (
              <div key={item.id} className="flex items-start text-[#3b4d9b] w-full gap-1.5">
                <div className="mt-1 w-2 h-2 shrink-0 rounded-sm border border-[#3b4d9b]/40" />
                <span className="text-xs leading-tight break-words flex-1 min-w-0">
                  {item.text}
                </span>
              </div>
            ))}
            {hiddenCount > 0 && (
              <p className="text-[10px] text-[#3b4d9b]/60 italic mt-0.5">
                và {hiddenCount} việc khác...
              </p>
            )}
            {(!note || note.items.length === 0) && (
              <p className="text-xs text-[#3b4d9b]/50 italic">Không có việc cần làm</p>
            )}
          </div>
        </div>

        {/* Nhân vật */}
        <div className="w-[120px] h-[120px] shrink-0 flex items-end justify-center">
          {REMINDER_CHARACTER_URL ? (
            <img
              src={REMINDER_CHARACTER_URL}
              alt="Capybara"
              className="w-full h-full object-contain drop-shadow-lg"
              draggable={false}
            />
          ) : (
            <div className="w-[100px] h-[100px] flex items-center justify-center text-6xl drop-shadow-lg">
              🐹
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TaskReminder;
