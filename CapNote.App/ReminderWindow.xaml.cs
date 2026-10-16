using System.Windows;
using CapNote.Core.Services;

namespace CapNote.App;

public partial class ReminderWindow : Window
{
    private readonly Action<string> _open; private readonly System.Windows.Threading.DispatcherTimer _hideTimer = new() { Interval = TimeSpan.FromSeconds(10) };
    private ReminderNote? Note => DataContext as ReminderNote;
    public ReminderWindow(Action<string> open) { _open = open; InitializeComponent(); _hideTimer.Tick += (_, _) => { _hideTimer.Stop(); Hide(); }; }
    public void ShowReminder(ReminderNote note)
    {
        DataContext = new ReminderNote(note.NoteId, note.Title, note.Items.Take(4).ToList());
        var area = SystemParameters.WorkArea; Left = area.Right - Width - 16; Top = area.Bottom - Height - 16;
        Show(); Activate(); _hideTimer.Stop(); _hideTimer.Start();
    }
    private void OpenClicked(object sender, System.Windows.Input.MouseButtonEventArgs e) { if (Note is null) return; _hideTimer.Stop(); Hide(); _open(Note.NoteId); }
    private void DismissClicked(object sender, RoutedEventArgs e) { e.Handled = true; _hideTimer.Stop(); Hide(); }
}
