# CapNote WPF

Phiên bản Windows native được phát triển song song với bản Electron. Dữ liệu mới được lưu tại
`%LocalAppData%\CapNote\data\notes.json`; profile Electron cũ không bị sửa hoặc xóa.

## Build và test

```powershell
dotnet build CapNote.slnx -c Release
dotnet test CapNote.Tests/CapNote.Tests.csproj -c Release
```

## Publish self-contained x64

```powershell
.\scripts\Publish-Wpf.ps1
```

Script publish resize bản sao frame animation trong output xuống 680 px. Source PNG 1080 px trong repo
được giữ nguyên. Có thể dùng `installer/CapNote.iss` với Inno Setup để tạo installer sau khi publish.

## Kiểm thử thủ công bắt buộc

- Windows 10/11 tại DPI 100%, 125% và 150%.
- Kéo note bằng chuột phải, resize ba cạnh, editor và drag/drop checklist.
- Đóng/minimize xuống tray; kiểm tra reminder sau 5 giây, click mở đúng note và tự ẩn sau 10 giây.
- Chạy lần đầu với profile Electron thật và kiểm tra backup payload tại `%LocalAppData%\CapNote\migration`.
