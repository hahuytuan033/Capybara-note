/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Laptop, Pencil, Eraser, HelpCircle, 
  Home, Briefcase, BookOpen, Leaf, Check, Square,
  Palette
} from 'lucide-react';
import { cn } from './lib/utils';
import capybaraImg from "./assets/images/capybara.png";

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
  '#f1c40f', // yellow (matching the image better)
  '#ffccf9', // pink
  '#ccf9ff', // blue
  '#ccffcc', // green
  '#ffdfcc', // orange
];

const ICONS = [
  { id: 'home', icon: Home },
  { id: 'work', icon: Briefcase },
  { id: 'book', icon: BookOpen },
  { id: 'leaf', icon: Leaf },
] as const;

interface StickyNoteProps {
  note: Note;
  boardRef: React.RefObject<HTMLDivElement>;
  resizingNoteId: string | null;
  setResizingNoteId: (id: string | null) => void;
  setActiveNoteId: (id: string | null) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
}

const StickyNote: React.FC<StickyNoteProps> = ({ 
  note, 
  boardRef, 
  resizingNoteId, 
  setResizingNoteId, 
  setActiveNoteId, 
  updateNote, 
  removeNote 
}) => {
  const scale = note.width / 112;
  const dragStartOffset = useRef({ x: 0, y: 0 });

  return (
    <motion.div
      drag={resizingNoteId !== note.id}
      dragConstraints={boardRef}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={(e, info) => {
        const rect = (e.target as HTMLElement).closest('.sticky-note')?.getBoundingClientRect();
        if (rect) {
          dragStartOffset.current = {
            x: info.point.x - rect.left,
            y: info.point.y - rect.top
          };
        }
      }}
      onDragEnd={(_, info) => {
        if (!boardRef.current) return;
        const boardRect = boardRef.current.getBoundingClientRect();
        updateNote(note.id, { 
          x: info.point.x - boardRect.left - dragStartOffset.current.x, 
          y: info.point.y - boardRect.top - dragStartOffset.current.y 
        });
      }}
      initial={{ scale: 0, rotate: note.rotation }}
      animate={{ scale: 1, rotate: note.rotation, x: 0, y: 0 }}
      transition={{
        x: { duration: 0 },
        y: { duration: 0 },
        default: { type: "spring", stiffness: 300, damping: 30 }
      }}
      exit={{ scale: 0 }}
      style={{ 
        left: note.x, 
        top: note.y,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        padding: `${16 * scale}px`,
      }}
      className="absolute shadow-lg cursor-move sticky-note flex flex-col group border border-black/5"
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

      {/* Resize Handle */}
      <div 
        onPointerDown={(e) => {
          e.stopPropagation();
          setResizingNoteId(note.id);
        }}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="flex items-center mb-1" style={{ gap: `${4 * scale}px` }}>
          {note.icon !== 'none' && (
            <div className="text-gray-700">
              {(() => {
                const IconComp = ICONS.find(i => i.id === note.icon)?.icon;
                return IconComp ? <IconComp size={12 * scale} /> : null;
              })()}
            </div>
          )}
          <h3 
            className="font-bold truncate text-[#3b4d9b]"
            style={{ fontSize: `${10 * scale}px` }}
          >
            {note.title}
          </h3>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {note.items.slice(0, 3).map(item => (
            <div 
              key={item.id} 
              className="flex items-center truncate text-[#3b4d9b]"
              style={{ gap: `${4 * scale}px`, fontSize: `${8 * scale}px` }}
            >
              <div 
                className={cn("border border-[#3b4d9b]/20 rounded-sm", item.completed && "bg-[#3b4d9b]/20")} 
                style={{ width: `${8 * scale}px`, height: `${8 * scale}px` }}
              />
              <span className={cn(item.completed && "line-through opacity-50")}>{item.text}</span>
            </div>
          ))}
          {note.items.length > 3 && (
            <div 
              className="opacity-50 text-[#3b4d9b]"
              style={{ fontSize: `${8 * scale}px` }}
            >
              ...
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('roberts-notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showBubble, setShowBubble] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resizingNoteId) return;

    const handlePointerMove = (e: PointerEvent) => {
      const note = notes.find(n => n.id === resizingNoteId);
      if (!note || !boardRef.current) return;

      const boardRect = boardRef.current.getBoundingClientRect();
      // Calculate new dimensions relative to the note's top-left corner
      const newWidth = Math.max(80, e.clientX - (boardRect.left + note.x));
      const newHeight = Math.max(80, e.clientY - (boardRect.top + note.y));

      updateNote(resizingNoteId, { width: newWidth, height: newHeight });
    };

    const handlePointerUp = () => {
      setResizingNoteId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizingNoteId, notes]);

  useEffect(() => {
    localStorage.setItem('roberts-notes', JSON.stringify(notes));
    if (notes.length > 0) setShowBubble(false);
  }, [notes]);

  const addNote = () => {
    if (!boardRef.current) return;
    
    const boardRect = boardRef.current.getBoundingClientRect();
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: "today's focus",
      items: [],
      icon: 'none',
      x: boardRect.width / 2 - 56 + (Math.random() * 40 - 20),
      y: boardRect.height / 2 - 56 + (Math.random() * 40 - 20),
      width: 112, // Default w-28 is 112px
      height: 112, // Default h-28 is 112px
      color: COLORS[0],
      rotation: Math.random() * 6 - 3,
    };
    
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
    setShowBubble(false);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const removeNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="min-h-screen w-full bg-[#fdf2d5] flex items-center justify-center overflow-hidden relative font-sans">
      <div className="w-[360px] h-[600px] bg-[#fdf2d5] flex flex-col items-center relative shadow-2xl overflow-hidden border-x border-black/5">
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
            {/* Close Button */}
            <button 
              onClick={() => setIsClosed(true)}
              className="absolute top-2 right-2 p-1.5 bg-black/5 hover:bg-black/10 rounded-full transition-colors z-50 group"
              title="Close App"
            >
              <X size={16} className="text-gray-400 group-hover:text-gray-600" />
            </button>

            {/* Corkboard Area */}
            <div 
              ref={boardRef}
              className="relative w-[350px] h-[350px] bg-[#c18a5e] border-[3px] border-[#a06e45] mt-[3px] rounded-[2.5rem] shadow-sm overflow-hidden"
            >
              {/* Cork Texture Overlay (Subtle) */}
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:30px_30px]" />
              
              <AnimatePresence>
                {notes.map((note: Note) => (
                  <StickyNote
                    key={note.id}
                    note={note}
                    boardRef={boardRef}
                    resizingNoteId={resizingNoteId}
                    setResizingNoteId={setResizingNoteId}
                    setActiveNoteId={setActiveNoteId}
                    updateNote={updateNote}
                    removeNote={removeNote}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Robert and Desk Area */}
            <div className="absolute bottom-0 left-0 right-0 h-[40%] flex flex-col items-center justify-end pointer-events-none">
              
              {/* Speech Bubble */}
              <AnimatePresence>
                {showBubble && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative mb-4 bg-[#b4c3f1] text-[#3b4d9b] p-5 rounded-[2rem] shadow-sm w-[240px] text-center font-bold text-sm z-20 border-2 border-[#3b4d9b]/10"
                  >
                    Click the sticky notes to add your focus for today!
                    {/* Bubble Tail */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#b4c3f1] transform rotate-45 border-r-2 border-b-2 border-[#3b4d9b]/10" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative w-full flex items-end justify-center px-2">
                {/* Desk Surface */}
                <div className="absolute bottom-0 w-full h-4 bg-[#c18a5e] border-t-[3px] border-[#a06e45] z-10" />

                <div className="relative flex items-end justify-center w-full mb-4 z-10 gap-0">
                  {/* Capybara Scene (contains Laptop, Mouse, Capybara) */}
                  <div className="relative w-[320px] h-[160px] mb-[-6px] shrink-0 flex items-end justify-center z-10">
                    <img 
                      src={capybaraImg} 
                      alt="Capybara Working" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Sticky Note Stack - Right of Scene */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addNote}
                    className="relative pointer-events-auto cursor-pointer shrink-0 mb-1 ml-[-20px] z-20"
                  >
                    <div className="w-12 h-8 bg-[#f1c40f] rounded-md border-[2px] border-white shadow-sm transform -rotate-2" />
                    <div className="absolute top-1 left-1 w-12 h-8 bg-[#f1c40f] rounded-md border-[2px] border-white shadow-sm transform rotate-1" />
                    <div className="absolute top-1.5 left-1.5 w-12 h-8 bg-[#f1c40f] rounded-md border-[2px] border-white shadow-md flex items-center justify-center">
                      <div className="w-full h-full border border-[#d4ac0d]/30 rounded-sm flex items-center justify-center">
                        <Plus size={14} className="text-[#d4ac0d]" />
                      </div>
                    </div>
                  </motion.button>

                  {/* Pencil Holder - Far Right */}
                  <div className="relative shrink-0 mb-1 ml-2 z-20">
                    <div className="w-10 h-12 bg-[#9ca3af] rounded-t-md border-[3px] border-[#4b5563] flex items-center justify-center">
                      <span className="text-[#4b5563] font-bold text-lg opacity-40">?</span>
                    </div>
                    {/* Pencils */}
                    <div className="absolute -top-4 left-1.5 w-1.5 h-7 bg-red-500 rounded-t-full border-x border-t border-black/10" />
                    <div className="absolute -top-6 left-5 w-1.5 h-9 bg-yellow-600 rounded-t-full border-x border-t border-black/10" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Note Editor Modal */}
      <AnimatePresence>
        {activeNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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

              {/* Sticky Note Content */}
              <div 
                className="relative w-full aspect-square rounded-3xl p-6 flex flex-col shadow-inner overflow-hidden mb-5"
                style={{ backgroundColor: activeNote.color }}
              >
                {/* Title */}
                <div className="mb-4">
                  <input
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    className="w-full text-2xl font-bold bg-transparent border-none outline-none font-handwriting text-[#3b4d9b] placeholder-[#3b4d9b]/30"
                    placeholder="today's focus"
                  />
                </div>

                {/* Checklist Items */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {activeNote.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 group/item">
                      <button 
                        onClick={() => {
                          const newItems = activeNote.items.map(i => 
                            i.id === item.id ? { ...i, completed: !i.completed } : i
                          );
                          updateNote(activeNote.id, { items: newItems });
                        }}
                        className="text-[#3b4d9b]/40 hover:text-[#3b4d9b]/70 transition-colors shrink-0"
                      >
                        {item.completed ? <Check size={20} /> : <Square size={20} />}
                      </button>
                      <input
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
                        className="opacity-0 group-hover/item:opacity-100 text-[#3b4d9b]/20 hover:text-[#3b4d9b]/50 transition-all shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {/* Tap to Add */}
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

                {/* Confirm Button (Bottom Right) - Matching Screenshot */}
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

              {/* Bottom Controls - Icons and Colors */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  {/* Icon Selector */}
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
                  
                  {/* Color Selector */}
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

                {/* Delete Note Button */}
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
