using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using CapNote.App.Controls;
using CapNote.App.ViewModels;

namespace CapNote.App;

public partial class MainWindow : Window
{
    private System.Windows.Point _dragStart; private NoteItemViewModel? _draggedItem;
    public MainViewModel ViewModel => (MainViewModel)DataContext;
    public event EventHandler? BecameHidden;
    public event EventHandler? BecameVisible;
    public MainWindow(MainViewModel vm)
    {
        DataContext = vm;
        InitializeComponent();
        Closing += WindowClosing;
        Closed += WindowClosed;
        Activated += WindowActivityChanged;
        Deactivated += WindowActivityChanged;
        StateChanged += WindowStateChanged;
        IsVisibleChanged += WindowVisibilityChanged;
        Loaded += WindowLoaded;
    }
    private void OpenNote(object sender, ViewModels.NoteViewModel e) { ViewModel.SelectNote(e); ViewModel.ActiveNote = e; }
    private void DeleteNote(object sender, ViewModels.NoteViewModel e) => ViewModel.DeleteNoteCommand.Execute(e);
    private void SelectNote(object sender, NoteViewModel e) => ViewModel.SelectNote(e);
    private void NoteInteractionStarted(object sender, NoteViewModel e) => ViewModel.BeginNoteInteraction(e);
    private void NoteInteractionCompleted(object sender, NoteViewModel e) => ViewModel.CompleteNoteInteraction(e);
    private void BoardMouseDown(object sender, MouseButtonEventArgs e)
    {
        if (ReferenceEquals(e.OriginalSource, Board)) ViewModel.SelectNote(null);
    }
    private void WindowLoaded(object sender, RoutedEventArgs e) => UpdateAnimationPlayback();
    private void WindowActivityChanged(object? sender, EventArgs e) => UpdateAnimationPlayback();
    private void WindowStateChanged(object? sender, EventArgs e)
    {
        UpdateAnimationPlayback();
        if (WindowState == WindowState.Minimized) BecameHidden?.Invoke(this, EventArgs.Empty);
        else BecameVisible?.Invoke(this, EventArgs.Empty);
    }
    private void WindowVisibilityChanged(object sender, DependencyPropertyChangedEventArgs e)
    {
        UpdateAnimationPlayback();
        if (IsVisible) BecameVisible?.Invoke(this, EventArgs.Empty);
    }
    private void UpdateAnimationPlayback()
    {
        if (IsActive && IsVisible && WindowState != WindowState.Minimized) Capybara.Play();
        else Capybara.Pause();
    }
    private void WindowClosing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        if (App.IsQuitting) return;
        e.Cancel = true;
        Capybara.Pause();
        Hide();
        BecameHidden?.Invoke(this, EventArgs.Empty);
    }
    private void WindowClosed(object? sender, EventArgs e) => Capybara.Dispose();
    private void WindowKeyDown(object sender, System.Windows.Input.KeyEventArgs e)
    {
        if (Keyboard.Modifiers.HasFlag(ModifierKeys.Control) && e.Key == Key.N) { ViewModel.AddNoteCommand.Execute(null); e.Handled = true; }
        else if (e.Key == Key.Escape && ViewModel.ActiveNote is not null) { ViewModel.CloseEditorCommand.Execute(null); e.Handled = true; }
        else if (Keyboard.Modifiers.HasFlag(ModifierKeys.Control) && e.Key == Key.Delete && ViewModel.ActiveNote is not null && Keyboard.FocusedElement is not System.Windows.Controls.TextBox)
        { ViewModel.DeleteNoteCommand.Execute(ViewModel.ActiveNote); e.Handled = true; }
    }
    private void ChecklistMouseDown(object sender, MouseButtonEventArgs e) { _dragStart = e.GetPosition(Checklist); _draggedItem = FindItem(e.OriginalSource as DependencyObject); }
    private void ChecklistMouseMove(object sender, System.Windows.Input.MouseEventArgs e) { if (e.LeftButton == MouseButtonState.Pressed && _draggedItem is not null && (e.GetPosition(Checklist) - _dragStart).Length > 5) System.Windows.DragDrop.DoDragDrop(Checklist, _draggedItem, System.Windows.DragDropEffects.Move); }
    private void ChecklistDrop(object sender, System.Windows.DragEventArgs e)
    {
        if (_draggedItem is null || ViewModel.ActiveNote is null) return; var target = FindItem(e.OriginalSource as DependencyObject); if (target is null) return;
        ViewModel.ActiveNote.MoveItem(ViewModel.ActiveNote.Items.IndexOf(_draggedItem), ViewModel.ActiveNote.Items.IndexOf(target)); _draggedItem = null;
    }
    private static NoteItemViewModel? FindItem(DependencyObject? source)
    {
        while (source is not null) { if (source is FrameworkElement { DataContext: NoteItemViewModel item }) return item; source = System.Windows.Media.VisualTreeHelper.GetParent(source); }
        return null;
    }
}
