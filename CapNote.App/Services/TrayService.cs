using System.Runtime.InteropServices;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;

namespace CapNote.App.Services;

public interface ITrayService : IDisposable { }

public sealed class TrayService : ITrayService
{
    private const uint NimAdd = 0, NimDelete = 2, NifMessage = 1, NifIcon = 2, NifTip = 4;
    private const int WmApp = 0x8000, CallbackMessage = WmApp + 42, WmLButtonUp = 0x0202, WmRButtonUp = 0x0205;
    private readonly HwndSource _source; private readonly Action _toggle; private readonly Action _quit; private NotifyIconData _data;

    public TrayService(Window owner, Action toggle, Action quit)
    {
        _toggle = toggle; _quit = quit;
        var handle = new WindowInteropHelper(owner).EnsureHandle();
        _source = HwndSource.FromHwnd(handle); _source.AddHook(WndProc);
        var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "favicon.ico");
        var icon = LoadImage(nint.Zero, iconPath, 1, 16, 16, 0x10);
        _data = new NotifyIconData { Size = Marshal.SizeOf<NotifyIconData>(), Window = handle, Id = 1,
            Flags = NifMessage | NifIcon | NifTip, CallbackMessage = CallbackMessage, Icon = icon, Tip = "CapNote", Info = "", InfoTitle = "" };
        ShellNotifyIcon(NimAdd, ref _data);
    }

    private nint WndProc(nint hwnd, int msg, nint wParam, nint lParam, ref bool handled)
    {
        if (msg != CallbackMessage) return nint.Zero;
        if ((int)lParam == WmLButtonUp) _toggle();
        else if ((int)lParam == WmRButtonUp)
        {
            var menu = new ContextMenu(); var open = new MenuItem { Header = "Mở CapNote" }; open.Click += (_, _) => _toggle();
            var exit = new MenuItem { Header = "Thoát" }; exit.Click += (_, _) => _quit(); menu.Items.Add(open); menu.Items.Add(exit); menu.IsOpen = true;
        }
        handled = true; return nint.Zero;
    }

    public void Dispose() { ShellNotifyIcon(NimDelete, ref _data); _source.RemoveHook(WndProc); if (_data.Icon != nint.Zero) DestroyIcon(_data.Icon); }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct NotifyIconData
    {
        public int Size; public nint Window; public uint Id; public uint Flags; public uint CallbackMessage; public nint Icon;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string Tip;
        public uint State; public uint StateMask;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string Info;
        public uint TimeoutOrVersion;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string InfoTitle;
        public uint InfoFlags; public Guid Guid; public nint BalloonIcon;
    }
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)] private static extern bool Shell_NotifyIcon(uint message, ref NotifyIconData data);
    private static bool ShellNotifyIcon(uint message, ref NotifyIconData data) => Shell_NotifyIcon(message, ref data);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern nint LoadImage(nint instance, string name, uint type, int width, int height, uint load);
    [DllImport("user32.dll")] private static extern bool DestroyIcon(nint icon);
}
