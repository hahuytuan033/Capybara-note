/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Laptop, Pencil, Eraser, HelpCircle, 
  Home, Briefcase, BookOpen, Leaf, Check, Square,
  Palette
} from 'lucide-react';
import { cn } from './lib/utils';
import CapybaraAnimation from './components/CapybaraAnimation';
import noteBtnImg from './assets/images/note_btn.png';
import messageImg from './assets/images/message.png';

interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Note {
  id: string;
  title: string;
  items: NoteItem[];
  icon: 'home' | 'work' | 'book' | 'leaf' | 'none';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
}

const COLORS = [
  '#f1c40f',
  '#ffccf9',
  '#ccf9ff',
  '#ccffcc',
  '#ffdfcc',
];

const ICONS = [
  { id: 'home', icon: Home },
  { id: 'work', icon: Briefcase },
  { id: 'book', icon: BookOpen },
  { id: 'leaf', icon: Leaf },
] as const;

// căn chỉnh content trong sticky note
const AutoSizeTextarea = ({ value, onChange, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={cn("resize-none overflow-hidden", className)}
      rows={1}
      {...props}
    />
  );
};

interface StickyNoteProps {
  note: Note;
  boardRef: React.RefObject<HTMLDivElement | null>;
  setActiveNoteId: (id: string | null) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
}

// Bọc bằng React.memo để loại bỏ renders thừa thãi khi kéo thả 1 note khác
const StickyNote: React.FC<StickyNoteProps> = React.memo(({ 
  note, 
  boardRef, 
  setActiveNoteId, 
  updateNote, 
  removeNote 
}) => {
  // Local state for dragging & resizing to avoid App re-renders
  const [localState, setLocalState] = useState<{ x?: number, y?: number, width?: number, height?: number } | null>(null);
  
  const currentX = localState?.x ?? note.x;
  const currentY = localState?.y ?? note.y;
  const currentWidth = localState?.width ?? note.width;
  const currentHeight = localState?.height ?? note.height;
  
  const scale = Math.min(currentWidth / 112, currentHeight / 112);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const noteStartPos = useRef({ x: 0, y: 0 });

  const handleRightMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 2) return; // Only right mouse button
    e.preventDefault();
    e.stopPropagation();

    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    noteStartPos.current = { x: currentX, y: currentY };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !boardRef.current) return;
      ev.preventDefault();
      
      const boardRect = boardRef.current.getBoundingClientRect();
      const dx = ev.clientX - dragStartPos.current.x;
      const dy = ev.clientY - dragStartPos.current.y;
      
      let newX = noteStartPos.current.x + dx;
      let newY = noteStartPos.current.y + dy;
      
      // Constrain within board
      newX = Math.max(0, Math.min(newX, boardRect.width - currentWidth));
      newY = Math.max(0, Math.min(newY, boardRect.height - currentHeight));
      
      setLocalState(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseUp = (ev: MouseEvent) => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Sync with global state only on mouse up
      setLocalState(prev => {
        if (prev && (prev.x !== undefined || prev.y !== undefined)) {
          updateNote(note.id, { x: prev.x ?? note.x, y: prev.y ?? note.y });
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.PointerEvent, direction: 'e' | 's' | 'se') => {
    e.stopPropagation();
    
    const handlePointerMove = (ev: PointerEvent) => {
      if (!boardRef.current) return;
      const boardRect = boardRef.current.getBoundingClientRect();
      const newWidth = Math.max(80, ev.clientX - (boardRect.left + currentX));
      const newHeight = Math.max(80, ev.clientY - (boardRect.top + currentY));
      
      const updates: any = {};
      if (direction === 'e' || direction === 'se') updates.width = newWidth;
      if (direction === 's' || direction === 'se') updates.height = newHeight;
      
      setLocalState(prev => ({ ...prev, ...updates }));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      // Sync with global state only on mouse up
      setLocalState(prev => {
        if (prev && (prev.width !== undefined || prev.height !== undefined)) {
          updateNote(note.id, { width: prev.width ?? currentWidth, height: prev.height ?? currentHeight });
        }
        return null;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <motion.div
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleRightMouseDown}
      initial={{ scale: 0, rotate: note.rotation }}
      animate={{ scale: 1, rotate: note.rotation }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      exit={{ scale: 0 }}
      style={{ 
        left: currentX, 
        top: currentY,
        width: currentWidth,
        height: currentHeight,
        backgroundColor: note.color,
        padding: `${16 * scale}px`,
      }}
      className="absolute shadow-lg sticky-note flex flex-col group border border-black/5 cursor-default"
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          removeNote(note.id);
        }}
        className="absolute -top-2 -right-2 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
      >
        <X size={14 * scale} className="text-gray-500" />
      </button>

      {/* East Resize Handle */}
      <div 
        onPointerDown={(e) => handleResizeStart(e, 'e')}
        className="absolute top-0 right-0 w-3 h-full cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
      />

      {/* South Resize Handle */}
      <div 
        onPointerDown={(e) => handleResizeStart(e, 's')}
        className="absolute bottom-0 left-0 w-full h-3 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
      />

      {/* South-East Resize Handle */}
      <div 
        onPointerDown={(e) => handleResizeStart(e, 'se')}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30"
      >
        <div 
          className="border-r-2 border-b-2 border-black/20" 
          style={{ width: `${6 * scale}px`, height: `${6 * scale}px` }}
        />
      </div>
      
      <div 
        className="flex-1 flex flex-col overflow-hidden cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setActiveNoteId(note.id);
        }}
      >
        <div className="flex items-start mb-1" style={{ gap: `${4 * scale}px` }}>
          {note.icon !== 'none' && (
            <div className="text-gray-700 shrink-0 mt-0.5">
              {(() => {
                const IconComp = ICONS.find(i => i.id === note.icon)?.icon;
                return IconComp ? <IconComp size={12 * scale} /> : null;
              })()}
            </div>
          )}
          <h3 
            className="font-bold text-[#3b4d9b] break-words line-clamp-3 leading-tight flex-1 min-w-0"
            style={{ fontSize: `${10 * scale}px` }}
          >
            {note.title}
          </h3>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-[2px]">
            {note.items.map(item => (
              <div 
                key={item.id} 
                className="flex items-start text-[#3b4d9b] w-full"
                style={{ gap: `${4 * scale}px`, fontSize: `${8 * scale}px` }}
              >
                <div 
                  className={cn("border border-[#3b4d9b]/20 rounded-sm shrink-0", item.completed && "bg-[#3b4d9b]/20")} 
                  style={{ width: `${8 * scale}px`, height: `${8 * scale}px`, marginTop: `${1 * scale}px` }}
                />
                <span className={cn("flex-1 break-words min-w-0 leading-tight", item.completed && "line-through opacity-50")}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// 🌙 BIẾN BOOL CHUYỂN ĐỔI ANIMATION TRONG CODE (CÁCH 2):
// - true: Chạy animation ban đêm / buồn ngủ (10h tối - 6h sáng: Idle_tired)
// - false: Chạy animation bình thường / làm việc (6h sáng - 10h tối: Idle_Work)
// ============================================================================
const IS_TIRED_ANIMATION: boolean = false;

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('roberts-notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showBubble, setShowBubble] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Debounced LocalStorage saving to prevent blocking thread
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('roberts-notes', JSON.stringify(notes));
    }, 500);
    
    if (notes.length > 0) setShowBubble(false);
    
    return () => clearTimeout(timer);
  }, [notes]);

  const addNote = useCallback(() => {
    if (!boardRef.current) return;
    
    const boardRect = boardRef.current.getBoundingClientRect();
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: "today's focus",
      items: [],
      icon: 'none',
      x: boardRect.width / 2 - 56 + (Math.random() * 40 - 20),
      y: boardRect.height / 2 - 56 + (Math.random() * 40 - 20),
      width: 112,
      height: 112,
      color: COLORS[0],
      rotation: Math.random() * 6 - 3,
    };
    
    setNotes(prev => [...prev, newNote]);
    setActiveNoteId(newNote.id);
    setShowBubble(false);
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setActiveNoteId(prev => prev === id ? null : prev);
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="min-h-screen w-full bg-[#fdf2d5] flex items-center justify-center overflow-hidden relative font-sans">
      <div className="w-[500px] h-[800px] bg-[#fdf2d5] flex flex-col items-center relative shadow-2xl overflow-hidden border-x border-black/5">
        {isClosed ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-gray-500 font-medium">App is closed</p>
            <button 
              onClick={() => setIsClosed(false)}
              className="px-4 py-2 bg-[#c18a5e] text-white rounded-full shadow-md hover:bg-[#a06e45] transition-colors"
            >
              Reopen App
            </button>
          </div>
        ) : (
          <>
            {/* <button 
              onClick={() => window.close()}
              className="absolute top-2 right-2 p-1.5 bg-black/5 hover:bg-black/10 rounded-full transition-colors z-50 group"
              title="Close App"
            >
              <X size={16} className="text-gray-400 group-hover:text-gray-600" />
            </button> */}

            <div 
              ref={boardRef}
              className="relative w-[475px] h-[450px] bg-[#c18a5e] border-[3px] border-[#a06e45] mt-[3px] rounded-[2.5rem] shadow-sm overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:30px_30px]" />
              
              <AnimatePresence>
                {notes.map((note: Note) => (
                  <StickyNote
                    key={note.id}
                    note={note}
                    boardRef={boardRef}
                    setActiveNoteId={setActiveNoteId}
                    updateNote={updateNote}
                    removeNote={removeNote}
                  />
                ))}
              </AnimatePresence>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[40%] flex flex-col items-center justify-end pointer-events-none">
              <AnimatePresence>
                {showBubble && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative mb-2 w-[260px] translate-x-[-50px] translate-y-[90px] flex items-center justify-center select-none z-20 pointer-events-none"
                  >
                    <img 
                      src={messageImg} 
                      alt="Message Bubble" 
                      className="w-full h-auto object-contain drop-shadow-md pointer-events-none"
                      draggable={false}
                    />
                    <div className="absolute inset-0 pt-4 pb-7 px-8 flex items-center justify-center text-center">
                      <p className="font-sans font-bold text-xs text-[#543d2b] leading-tight select-none">
                        Viết những việc quan trọng nhất hôm nay vào giấy note nha!
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative w-full flex items-end justify-center px-2">
                <div className="absolute bottom-0 w-full h-4 bg-[#c18a5e] border-t-[3px] border-[#a06e45] z-10" />

                <div className="relative flex items-end justify-center w-full mb-4 z-10 gap-0">
                  {/* chỉnh kích thước cho capybara */}
                  <div className="relative w-[340px] h-[340px] mb-[-40px] -translate-x-[-110px] shrink-0 flex items-end justify-center z-10">
                    <CapybaraAnimation isTired={IS_TIRED_ANIMATION} className="w-full h-full object-contain" fps={12} />
                  </div>

                  {/* chỉnh kích thước của button note */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={addNote}
                    className="relative pointer-events-auto cursor-pointer shrink-0 mb-1 ml-[-20px] z-20 focus:outline-none translate-x-[-1px] translate-y-[-32px]"
                    title="Add Note"
                  >
                    <img 
                      src={noteBtnImg} 
                      alt="Add Note" 
                      className="w-14 h-auto object-contain select-none drop-shadow-md pointer-events-none"
                      draggable={false}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {activeNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-[95%] max-w-[360px] bg-[#c18a5e] p-5 rounded-[2.5rem] border-4 border-[#a06e45] shadow-2xl"
            >
              <button 
                onClick={() => {
                  setActiveNoteId(null);
                  setShowColorPicker(false);
                }}
                className="absolute top-4 right-6 text-[#a06e45] hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div 
                className="relative w-full aspect-square rounded-3xl p-6 flex flex-col shadow-inner overflow-hidden mb-5"
                style={{ backgroundColor: activeNote.color }}
              >
                <div className="mb-4">
                  <AutoSizeTextarea
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    className="w-full text-2xl font-bold bg-transparent border-none outline-none font-handwriting text-[#3b4d9b] placeholder-[#3b4d9b]/30"
                    placeholder="today's focus"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {activeNote.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 group/item">
                      <button 
                        onClick={() => {
                          const newItems = activeNote.items.map(i => 
                            i.id === item.id ? { ...i, completed: !i.completed } : i
                          );
                          updateNote(activeNote.id, { items: newItems });
                        }}
                        className="mt-1 text-[#3b4d9b]/40 hover:text-[#3b4d9b]/70 transition-colors shrink-0"
                      >
                        {item.completed ? <Check size={20} /> : <Square size={20} />}
                      </button>
                      <AutoSizeTextarea
                        value={item.text}
                        onChange={(e) => {
                          const newItems = activeNote.items.map(i => 
                            i.id === item.id ? { ...i, text: e.target.value } : i
                          );
                          updateNote(activeNote.id, { items: newItems });
                        }}
                        className={cn(
                          "flex-1 bg-transparent border-none outline-none font-handwriting text-lg text-[#3b4d9b]",
                          item.completed && "line-through opacity-50"
                        )}
                      />
                      <button 
                        onClick={() => {
                          const newItems = activeNote.items.filter(i => i.id !== item.id);
                          updateNote(activeNote.id, { items: newItems });
                        }}
                        className="mt-1 opacity-0 group-hover/item:opacity-100 text-[#3b4d9b]/20 hover:text-[#3b4d9b]/50 transition-all shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const newItem: NoteItem = {
                        id: Math.random().toString(36).substr(2, 9),
                        text: '',
                        completed: false,
                      };
                      updateNote(activeNote.id, { items: [...activeNote.items, newItem] });
                    }}
                    className="flex items-center gap-3 w-full text-[#3b4d9b]/30 hover:text-[#3b4d9b]/50 transition-colors py-1"
                  >
                    <Square size={20} />
                    <span className="font-handwriting text-lg italic">tap to add...</span>
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setActiveNoteId(null);
                    setShowColorPicker(false);
                  }}
                  className="absolute bottom-0 right-0 w-14 h-14 bg-black/10 rounded-tl-3xl flex items-center justify-center hover:bg-black/20 transition-colors"
                >
                  <Check size={28} className="text-[#3b4d9b]/40" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {ICONS.map(({ id, icon: IconComp }) => (
                      <button
                        key={id}
                        onClick={() => updateNote(activeNote.id, { icon: id as any })}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                          activeNote.icon === id 
                            ? "bg-[#3b4d9b] text-white scale-105" 
                            : "bg-[#e8d5c4] text-[#3b4d9b] hover:bg-[#dfc8b3]"
                        )}
                      >
                        <IconComp size={18} />
                      </button>
                    ))}
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                        showColorPicker 
                          ? "bg-[#3b4d9b] text-white" 
                          : "bg-[#e8d5c4] text-[#3b4d9b] hover:bg-[#dfc8b3]"
                      )}
                      title="Custom Color"
                    >
                      <Palette size={18} />
                    </button>

                    {showColorPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-2xl shadow-xl border border-black/5 z-[60] flex flex-col gap-3 min-w-[160px]"
                      >
                        <div className="grid grid-cols-5 gap-2">
                          {COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                updateNote(activeNote.id, { color });
                                setShowColorPicker(false);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-transform",
                                activeNote.color === color ? "border-[#3b4d9b] scale-110 shadow-sm" : "border-transparent hover:scale-110"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        
                        <div className="h-px bg-black/5 w-full" />
                        
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={activeNote.color}
                            onChange={(e) => updateNote(activeNote.id, { color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                          />
                          <span className="text-[10px] font-bold text-[#3b4d9b] opacity-50 uppercase tracking-wider">
                            {activeNote.color}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeNote(activeNote.id)}
                  className="w-full py-2 text-[#3b4d9b]/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Eraser size={14} />
                  Delete Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
