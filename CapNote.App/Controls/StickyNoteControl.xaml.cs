using System.Windows;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using CapNote.App.ViewModels;

namespace CapNote.App.Controls;

public partial class StickyNoteControl : System.Windows.Controls.UserControl
{
    private const double DragThreshold = 5;
    private Point _mouseStart;
    private double _xStart;
    private double _yStart;
    private bool _pointerCaptured;
    private bool _hasDragged;

    public static readonly DependencyProperty IsSelectedProperty = DependencyProperty.Register(
        nameof(IsSelected), typeof(bool), typeof(StickyNoteControl), new PropertyMetadata(false));
    public bool IsSelected { get => (bool)GetValue(IsSelectedProperty); set => SetValue(IsSelectedProperty, value); }

    public event EventHandler<NoteViewModel>? OpenRequested;
    public event EventHandler<NoteViewModel>? DeleteRequested;
    public event EventHandler<NoteViewModel>? SelectionRequested;
    public event EventHandler<NoteViewModel>? InteractionStarted;
    public event EventHandler<NoteViewModel>? InteractionCompleted;

    public StickyNoteControl() => InitializeComponent();
    private NoteViewModel Note => (NoteViewModel)DataContext;

    private void HeaderMouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left) return;
        e.Handled = true;
        SelectionRequested?.Invoke(this, Note);
        InteractionStarted?.Invoke(this, Note);
        _pointerCaptured = true; _hasDragged = false;
        _mouseStart = e.GetPosition(Parent as IInputElement); _xStart = Note.X; _yStart = Note.Y;
        CaptureMouse(); MouseMove += HeaderMouseMove; MouseLeftButtonUp += HeaderMouseUp;
    }

    private void HeaderMouseMove(object sender, MouseEventArgs e)
    {
        if (!_pointerCaptured || e.LeftButton != MouseButtonState.Pressed) return;
        var point = e.GetPosition(Parent as IInputElement); var delta = point - _mouseStart;
        if (!_hasDragged && delta.Length < DragThreshold) return;
        _hasDragged = true;
        Note.X = Math.Clamp(_xStart + delta.X, 0, 475 - Note.Width);
        Note.Y = Math.Clamp(_yStart + delta.Y, 0, 450 - Note.Height);
    }

    private void HeaderMouseUp(object sender, MouseButtonEventArgs e)
    {
        _pointerCaptured = false; ReleaseMouseCapture(); MouseMove -= HeaderMouseMove; MouseLeftButtonUp -= HeaderMouseUp;
        InteractionCompleted?.Invoke(this, Note); e.Handled = true;
    }

    private void OpenNote(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left) return;
        SelectionRequested?.Invoke(this, Note); OpenRequested?.Invoke(this, Note); e.Handled = true;
    }
    private void DeleteNote(object sender, RoutedEventArgs e) { e.Handled = true; DeleteRequested?.Invoke(this, Note); }
    private void ResizeStarted(object sender, DragStartedEventArgs e) { SelectionRequested?.Invoke(this, Note); InteractionStarted?.Invoke(this, Note); }
    private void ResizeCompleted(object sender, DragCompletedEventArgs e) => InteractionCompleted?.Invoke(this, Note);
    private void ResizeEast(object sender, DragDeltaEventArgs e) => Note.Width = Math.Clamp(Note.Width + e.HorizontalChange, 120, 475 - Note.X);
    private void ResizeSouth(object sender, DragDeltaEventArgs e) => Note.Height = Math.Clamp(Note.Height + e.VerticalChange, 120, 450 - Note.Y);
    private void ResizeCorner(object sender, DragDeltaEventArgs e) { ResizeEast(sender, e); ResizeSouth(sender, e); }
}
