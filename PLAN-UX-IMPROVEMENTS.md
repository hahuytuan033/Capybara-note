# Plan: Cải thiện User Interaction cho CapNote

## Context

App hiện tại có những hạn chế về UX:
1. **Thiếu keyboard shortcuts** - Không có cách nhanh để thao tác bằng bàn phím
2. **Color picker không đóng khi click outside** - User phải click nút close
3. **Thiếu visual feedback** - Không có toast/notification cho các actions
4. **Delete không có confirmation** - Có thể xóa nhầm
5. **Checklist items không thể reorder** - Không thể sắp xếp thứ tự
6. **Empty state chỉ là bubble cứng** - Không có placeholder cho lần đầu

---

## Proposed Improvements

### 1. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Tạo note mới |
| `Escape` | Đóng modal |
| `Ctrl/Cmd + Delete` | Xóa note đang active |
| `Tab` | Di chuyển focus giữa checklist items |
| `Enter` | Toggle checkbox / thêm item mới |

### 2. Color Picker Outside Click

Tự động đóng color picker khi:
- Click ra ngoài color picker dropdown
- Press Escape

### 3. Toast Notifications

Thêm toast system cho:
- ✅ "Note đã được tạo"
- ✅ "Note đã được xóa" (với Undo trong 5 giây)
- ✅ "Đã lưu"

### 4. Delete Confirmation

- Thêm button "Delete" ở dưới cùng modal (đã có)
- Thêm visual feedback khi hover
- Toast với Undo cho accidental delete

### 5. Reorder Checklist Items

Cho phép drag checklist items để reorder:
- Sử dụng react-beautiful-dnd hoặc custom drag implementation
- Hoặc đơn giản hơn: up/down buttons

### 6. Empty State Enhancement

- Hiện message hướng dẫn khi không có notes
- Animation nhẹ để thu hút attention

---

## Implementation Plan

### Phase 1: Quick Wins (Keyboard Shortcuts + Toast)

**Files:** `src/App.tsx`

1. Thêm `useEffect` để listen keyboard events
2. Tạo `Toast` component
3. Tạo `ToastProvider` context

### Phase 2: UX Polish

1. Color picker outside click handling
2. Delete confirmation với undo
3. Empty state improvement

### Phase 3: Enhanced Interactions

1. Checklist item reordering (optional)
2. Double-click to quick edit
3. Focus management improvements

---

## Files cần thay đổi

| File | Changes |
|------|---------|
| `src/App.tsx` | Add keyboard shortcuts, toast system |
| `src/components/Toast.tsx` | **New** - Toast component |
| `src/hooks/useToast.ts` | **New** - Toast hook |

---

## Verification

1. Test all keyboard shortcuts
2. Verify toast notifications appear correctly
3. Test color picker outside click
4. Test delete with undo
5. Test empty state
