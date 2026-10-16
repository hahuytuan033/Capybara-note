using System.Windows;
using CapNote.App.Services;
using CapNote.App.ViewModels;
using CapNote.Core.Services;

namespace CapNote.App;

public partial class App : System.Windows.Application
{
    public static bool IsQuitting { get; private set; }
    private JsonNoteRepository? _repository; private MainViewModel? _vm; private MainWindow? _main;
    private ReminderService? _reminders; private ReminderWindow? _reminderWindow; private ITrayService? _tray;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        _repository = new JsonNoteRepository();
        var migration = new LegacyMigrationService(_repository);
        var migrationResult = await migration.MigrateAsync();
        if (migrationResult.Status is MigrationStatus.Failed or MigrationStatus.SourceLocked)
        {
            var retry = System.Windows.MessageBox.Show(migrationResult.Message + "\n\nThử lại ngay?", "CapNote — chuyển dữ liệu", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (retry == MessageBoxResult.Yes) migrationResult = await migration.MigrateAsync();
        }
        var settingsRepository = new JsonAppSettingsRepository();
        _vm = new MainViewModel(_repository, settingsRepository, new NotePlacementService()); await _vm.LoadAsync();
        _main = new MainWindow(_vm); MainWindow = _main;
        _reminders = new ReminderService(); _reminderWindow = new ReminderWindow(OpenNote);
        _reminders.ReminderDue += (_, note) => Dispatcher.Invoke(() => _reminderWindow.ShowReminder(note));
        _vm.NotesChanged += (_, _) => _reminders.Update(_vm.Notes.Select(n => n.Model));
        _reminders.Update(_vm.Notes.Select(n => n.Model));
        _main.BecameHidden += (_, _) => _reminders.Start(); _main.BecameVisible += (_, _) => { _reminders.Stop(); _reminderWindow.Hide(); };
        _tray = new TrayService(_main, ToggleMain, Quit);
        _main.Show();
        if (migrationResult.Status == MigrationStatus.Succeeded) System.Windows.MessageBox.Show(migrationResult.Message, "CapNote", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private void ToggleMain()
    {
        if (_main is null) return; if (_main.IsVisible && _main.WindowState != WindowState.Minimized) { _main.Hide(); _reminders?.Start(); }
        else { _main.Show(); _main.WindowState = WindowState.Normal; _main.Activate(); }
    }
    private void OpenNote(string id) { if (_main is null || _vm is null) return; _main.Show(); _main.WindowState = WindowState.Normal; _main.Activate(); _vm.Open(id); }
    private async void Quit()
    {
        IsQuitting = true; _reminders?.Stop(); if (_vm is not null) await _vm.FlushAsync(); _tray?.Dispose(); _reminderWindow?.Close(); _main?.Close(); Shutdown();
    }
    protected override void OnExit(ExitEventArgs e) { _reminders?.Dispose(); _vm?.Dispose(); _tray?.Dispose(); base.OnExit(e); }
}
