# Plan: Implement Reorder Checklist Items

## Context

Người dùng muốn sắp xếp thứ tự các checklist items trong note. Hiện tại items được add theo thứ tự thời gian, không thể thay đổi.

---

## Approach

### Option 1: Drag & Drop (Best UX)
- Sử dụng native HTML5 drag & drop API
- Không cần thêm thư viện
- Visual feedback khi kéo

### Option 2: Up/Down Buttons (Simpler)
- Thêm 2 nút ▲ ▼ bên cạnh mỗi item
- Click để di chuyển lên/xuống
- Dễ implement hơn nhưng tốn không gian

**Chọn: Option 1 (Drag & Drop)** - Better UX, không thêm dependency

---

## Implementation Details

### 1. Drag State Management

```typescript
// State để track item đang được kéo
const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

// Drop target highlight
const [dropTargetId, setDropTargetId] = useState<string | null>(null);
```

### 2. Drag Handlers cho mỗi Item

```typescript
const handleDragStart = (e: React.DragEvent, itemId: string) => {
  setDraggedItemId(itemId);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', itemId);
};

const handleDragOver = (e: React.DragEvent, itemId: string) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (draggedItemId !== itemId) {
    setDropTargetId(itemId);
  }
};

const handleDragLeave = () => {
  setDropTargetId(null);
};

const handleDrop = (e: React.DragEvent, targetId: string) => {
  e.preventDefault();
  if (!draggedItemId || draggedItemId === targetId) return;

  // Reorder logic
  const items = [...activeNote.items];
  const draggedIndex = items.findIndex(i => i.id === draggedItemId);
  const targetIndex = items.findIndex(i => i.id === targetId);

  const [draggedItem] = items.splice(draggedIndex, 1);
  items.splice(targetIndex, 0, draggedItem);

  updateNote(activeNote.id, { items });

  // Reset state
  setDraggedItemId(null);
  setDropTargetId(null);
};

const handleDragEnd = () => {
  setDraggedItemId(null);
  setDropTargetId(null);
};
```

### 3. Visual Feedback

```typescript
// Thêm class khi đang kéo/drop
className={cn(
  "flex items-start gap-3 group/item transition-all",
  draggedItemId === item.id && "opacity-50",
  dropTargetId === item.id && "border-t-2 border-[#3b4d9b]"
)}
```

### 4. Cursor & Drag Handle

Thêm icon kéo ở đầu mỗi item:
```typescript
< GripVertical size={16} className="cursor-grab opacity-0 group-hover:opacity-50" />
```

---

## Files cần thay đổi

| File | Changes |
|------|---------|
| `src/App.tsx` | Thêm drag handlers, state, visual feedback |

---

## Verification

1. Tạo note với 3+ items
2. Kéo item từ vị trí 1 → 3
3. Verify thứ tự được cập nhật đúng
4. Verify visual feedback (opacity, border)
5. Test với keyboard (có thể bỏ qua cho MVP)

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Add drag state | 10 min |
| Implement drag handlers | 15 min |
| Add visual feedback | 10 min |
| Test | 5 min |
| **Total** | ~40 min |
