using System.Collections.ObjectModel;
using CapNote.Core.Models;
using CapNote.Core.Services;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace CapNote.App.ViewModels;

public partial class MainViewModel : ObservableObject, IDisposable
{
    private static readonly string[] Colors = ["#F1C40F", "#FFCCF9", "#CCF9FF", "#CCFFCC", "#FFDFCC"];
    private readonly INoteRepository _repository;
    private readonly IAppSettingsRepository _settingsRepository;
    private readonly INotePlacementService _placementService;
    private CancellationTokenSource? _saveCts;
    private Note? _deleted;
    public ObservableCollection<NoteViewModel> Notes { get; } = [];
    public IReadOnlyList<string> PresetColors => Colors;
    [ObservableProperty] private NoteViewModel? activeNote;
    [ObservableProperty] private string? toastMessage;
    [ObservableProperty] private bool canUndo;
    [ObservableProperty] private bool isOnboardingVisible;
    [ObservableProperty] private int onboardingStep;
    private NoteViewModel? _selectedNote;
    public NoteViewModel? SelectedNote
    {
        get => _selectedNote;
        set
        {
            if (_selectedNote == value) return;
            if (_selectedNote is not null) _selectedNote.IsSelected = false;
            SetProperty(ref _selectedNote, value);
            if (_selectedNote is not null) _selectedNote.IsSelected = true;
        }
    }
    public bool HasNoNotes => Notes.Count == 0;
    public string OnboardingTitle => OnboardingStep switch { 0 => "Tạo note đầu tiên", 1 => "Di chuyển thật dễ", _ => "Thay đổi kích thước" };
    public string OnboardingProgress => $"Bước {OnboardingStep + 1} / 3";
    public string OnboardingMessage => OnboardingStep switch
    {
        0 => "Bấm vào tờ giấy cạnh capybara để tạo một note mới.",
        1 => "Giữ và kéo phần đầu của note bằng chuột trái.",
        _ => "Kéo góc dưới bên phải để làm note lớn hoặc nhỏ hơn."
    };
    public event EventHandler? NotesChanged;

    public MainViewModel(INoteRepository repository, IAppSettingsRepository settingsRepository, INotePlacementService placementService)
    {
        _repository = repository; _settingsRepository = settingsRepository; _placementService = placementService;
    }

    public async Task LoadAsync()
    {
        var document = await _repository.LoadAsync();
        Notes.Clear(); foreach (var note in document.Notes) { var vm = new NoteViewModel(note, Changed); vm.Clamp(475, 450); Notes.Add(vm); }
        var settings = await _settingsRepository.LoadAsync();
        IsOnboardingVisible = !settings.HasCompletedBoardOnboarding;
        OnPropertyChanged(nameof(HasNoNotes));
        NotesChanged?.Invoke(this, EventArgs.Empty);
    }

    [RelayCommand]
    private void AddNote()
    {
        const double size = 140;
        var position = _placementService.FindPosition(Notes.Select(n => n.Model), size, size);
        var model = new Note { X = position.X, Y = position.Y, Width = size, Height = size, Rotation = Random.Shared.NextDouble() * 4 - 2 };
        var vm = new NoteViewModel(model, Changed); Notes.Add(vm); SelectNote(vm); ActiveNote = vm;
        OnPropertyChanged(nameof(HasNoNotes)); Changed(); ShowToast("Đã tạo note mới!");
    }

    [RelayCommand]
    private void DeleteNote(NoteViewModel? note)
    {
        if (note is null) return; _deleted = note.Model.Clone(); Notes.Remove(note); if (ActiveNote == note) ActiveNote = null; if (SelectedNote == note) SelectedNote = null;
        OnPropertyChanged(nameof(HasNoNotes));
        CanUndo = true; Changed(); ShowToast($"Đã xóa “{note.Title}” — nhấn Hoàn tác để khôi phục");
    }

    [RelayCommand]
    private void UndoDelete()
    {
        if (_deleted is null) return; var restored = new NoteViewModel(_deleted, Changed); Notes.Add(restored); SelectNote(restored); _deleted = null; CanUndo = false;
        OnPropertyChanged(nameof(HasNoNotes)); Changed(); ShowToast("Đã khôi phục note.");
    }

    [RelayCommand] private void CloseEditor() => ActiveNote = null;
    [RelayCommand] private void AddItem() => ActiveNote?.AddItem();
    [RelayCommand] private void RemoveItem(NoteItemViewModel? item) { if (item is not null) ActiveNote?.RemoveItem(item); }
    [RelayCommand] private void SetIcon(string? icon) { if (ActiveNote is not null && Enum.TryParse<NoteIcon>(icon, true, out var value)) ActiveNote.Icon = value; }
    [RelayCommand] private void SetColor(string? color) { if (ActiveNote is not null && color is not null) ActiveNote.Color = color; }

    public void Open(string noteId) { var note = Notes.FirstOrDefault(n => n.Id == noteId); if (note is not null) { SelectNote(note); ActiveNote = note; } }
    public void SelectNote(NoteViewModel? note) { SelectedNote = note; if (note is not null) BringToFront(note); }
    public void BringToFront(NoteViewModel note)
    {
        var index = Notes.IndexOf(note); if (index < 0 || index == Notes.Count - 1) return;
        Notes.Move(index, Notes.Count - 1); Changed();
    }
    public void BeginNoteInteraction(NoteViewModel note) { SelectNote(note); note.BeginInteraction(); }
    public void CompleteNoteInteraction(NoteViewModel note) => note.EndInteraction();
    [RelayCommand] private void ShowOnboarding() { OnboardingStep = 0; IsOnboardingVisible = true; }
    [RelayCommand] private async Task NextOnboardingAsync()
    {
        if (OnboardingStep < 2) { OnboardingStep++; OnPropertyChanged(nameof(OnboardingTitle)); OnPropertyChanged(nameof(OnboardingMessage)); OnPropertyChanged(nameof(OnboardingProgress)); return; }
        await CompleteOnboardingAsync();
    }
    [RelayCommand] private Task SkipOnboardingAsync() => CompleteOnboardingAsync();
    private async Task CompleteOnboardingAsync()
    {
        IsOnboardingVisible = false; OnboardingStep = 0;
        await _settingsRepository.SaveAsync(new AppSettings { HasCompletedBoardOnboarding = true });
    }
    public void MarkChanged() => Changed();
    private void Changed()
    {
        NotesChanged?.Invoke(this, EventArgs.Empty); _saveCts?.Cancel(); _saveCts?.Dispose(); _saveCts = new(); _ = SaveAfterDelayAsync(_saveCts.Token);
    }
    private async Task SaveAfterDelayAsync(CancellationToken token)
    {
        try { await Task.Delay(500, token); await _repository.SaveAsync(new AppDataDocument { Notes = Notes.Select(n => n.Model).ToList() }, token); }
        catch (OperationCanceledException) { }
    }
    private async void ShowToast(string message) { ToastMessage = message; await Task.Delay(4000); if (ToastMessage == message) ToastMessage = null; }
    public async Task FlushAsync() => await _repository.SaveAsync(new AppDataDocument { Notes = Notes.Select(n => n.Model).ToList() });
    public void Dispose() { _saveCts?.Cancel(); _saveCts?.Dispose(); }
}
