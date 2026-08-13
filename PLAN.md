# 📋 Plan: Thổi hồn cho Capybara Note

> Mục tiêu: thêm 4 nhóm tính năng giúp app dễ thương, gần gũi và "có hồn" hơn — mà chi phí thấp.

## 🎯 Phạm vi
1. Capybara phản ứng theo hành động
2. Hiệu ứng + âm thanh nhỏ
3. Lời động viên ngẫu nhiên
4. Dark mode / theme ban đêm

## ✅ Quyết định đã chốt
| Hạng mục | Lựa chọn | Ghi chú triển khai |
|---|---|---|
| **Capybara phản ứng** | Người dùng **sẽ cung cấp clip mới** (happy / sleep / celebrate...) | Code thiết kế theo dạng **swap clip theo trạng thái**; trước khi có clip dùng animation + overlay emoji làm tạm |
| **Âm thanh** | **Tổng hợp bằng Web Audio API** (oscillator) | Không bundle file mp3, có cờ bật/tắt |
| **Dark mode** | **Tự theo giờ / hệ thống** (`prefers-color-scheme`) | Vẫn cho phép override thủ công bằng nút toggle |
| **Ngôn ngữ** | **Tiếng Việt** | Lời động viên + nút bấm bằng tiếng Việt |

## ⚠️ Ràng buộc kỹ thuật
- App hiện chỉ có **1 clip capybara** (`src/assets/images/capybara.mp4`), **không có file âm thanh**.
- Màu đang **hardcode** khắp `App.tsx` (vd `bg-[#fdf2d5]`) → cần refactor sang CSS variables để dark mode chạy được.
- Một số token màu đã có sẵn trong `src/index.css` (`--color-desk-bg`, `--color-board`, ...).
- Confetti: viết bằng `motion` (đã có sẵn) thay vì thêm thư viện.

---

## 🧱 Task 0 — Nền tảng dùng chung
- [ ] **0.1** `src/lib/sound.ts`: AudioContext singleton (tránh tạo nhiều context).
- [ ] **0.2** `src/hooks/useSound.ts`: hook phát tiếng `pop` / `tick` / `success` (oscillator), có cờ bật/tắt lưu localStorage.
- [ ] **0.3** `src/components/Confetti.tsx`: component confetti bằng `motion`, nhận `trigger`/`origin`, tự dọn sau ~1.5s.

## 🐹 Task 1 — Capybara phản ứng theo hành động
- [ ] **1.1** Máy trạng thái capybara: `idle` | `happy` | `celebrate` | `sleeping`.
- [ ] **1.2** Tạo `src/components/Capybara.tsx`: nhận `state`, **map state → clip** (sẵn sàng swap clip khi có asset); tạm thời dùng `motion` animation + overlay emoji 💤 ✨ 🎉 trên clip hiện có.
  - `happy` (tạo note): nảy nhẹ 1 cái
  - `celebrate` (xong hết checklist): nhảy mừng + overlay ✨/🎉
  - `sleeping` (idle lâu): lắc lư chậm + overlay 💤
- [ ] **1.3** Idle timer (vd 60s không thao tác → `sleeping`; có thao tác → tỉnh). Tận dụng pattern blur/focus đã có (`App.tsx:290`).
- [ ] **1.4** Trigger `celebrate` khi 1 note chuyển từ "còn việc" sang "tất cả item completed".

> 📌 Khi có clip mới: chỉ cần bỏ clip vào `src/assets/images/` và khai báo map `state → src` trong `Capybara.tsx`.

## 🎉 Task 2 — Hiệu ứng + âm thanh
- [ ] **2.1** `addNote` → phát `pop` + capybara `happy` (`App.tsx:318`).
- [ ] **2.2** Tick checklist item → phát `tick` (`App.tsx:490` và bản trong modal).
- [ ] **2.3** Hoàn thành toàn bộ checklist 1 note → `success` + **Confetti** + capybara `celebrate`.
- [ ] **2.4** Nút bật/tắt âm thanh 🔇 (góc trên), lưu localStorage.

## 💬 Task 3 — Lời động viên ngẫu nhiên (tiếng Việt)
- [ ] **3.1** `src/data/messages.ts`: mảng câu động viên tiếng Việt ("Bạn làm tốt lắm!", "Nghỉ tay uống nước nhé 🍵"...).
- [ ] **3.2** Bong bóng thoại (`App.tsx:403`) lấy câu ngẫu nhiên thay vì cố định.
- [ ] **3.3** "Câu của ngày": seed theo ngày để mỗi ngày 1 câu cố định; đổi câu khi có sự kiện (tạo xong note / hoàn thành note).

## 🌙 Task 4 — Dark mode (tự theo giờ/hệ thống)
- [ ] **4.1** Refactor màu hardcode trong `App.tsx` → CSS variables (mở rộng từ `index.css:3`).
- [ ] **4.2** Bảng màu `dark` (nâu/xanh trầm ấm) trong `index.css` qua `[data-theme="dark"]`.
- [ ] **4.3** Tự chọn theme theo `prefers-color-scheme` lúc khởi động.
- [ ] **4.4** Nút 🌙/☀️ override thủ công, lưu localStorage, set `data-theme` trên `<html>`.

## ✅ Task 5 — Kiểm thử & hoàn thiện
- [ ] **5.1** `npm run lint` (tsc) sạch lỗi type.
- [ ] **5.2** `npm run dev` + Electron, test thủ công 4 tính năng.
- [ ] **5.3** Cập nhật `README.md` phần Features.

---

## 🗓️ Thứ tự thực hiện
**Task 0 → 3 → 2 → 1 → 4**
(dễ trước, refactor màu để cuối). Capybara (Task 1) phần animation tạm làm trước; phần swap clip chờ asset.

## 📦 Dependency
Không thêm mới — dùng `motion` (có sẵn) + Web Audio API (native).
