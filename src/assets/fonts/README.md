# 🔤 Thư mục chứa Font chữ (Custom Fonts)

Hãy thả các file font chữ của bạn vào thư mục này (định dạng hỗ trợ: `.woff2`, `.woff`, `.ttf`, `.otf`).

---

### 📝 Hướng dẫn kích hoạt Font trong `src/index.css`:

Sau khi bạn thả file font vào thư mục này (ví dụ: `MyFont.ttf` hoặc `MyFont.woff2`), hãy mở file [`src/index.css`](../index.css) và khai báo `@font-face` như sau:

```css
@font-face {
  font-family: 'AppCustomFont';
  src: url('./assets/fonts/MyFont.woff2') format('woff2'),
       url('./assets/fonts/MyFont.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

Và cập nhật vào `@theme` trong `src/index.css`:

```css
@theme {
  --font-sans: "AppCustomFont", "Inter", ui-sans-serif, system-ui, sans-serif;
}
```
