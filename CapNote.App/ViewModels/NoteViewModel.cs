using System.Collections.ObjectModel;
using CapNote.Core.Models;
using CommunityToolkit.Mvvm.ComponentModel;

namespace CapNote.App.ViewModels;

public partial class NoteViewModel : ObservableObject
{
    private readonly Action _changed;
    private bool _interactionActive;
    private bool _interactionChanged;
    public Note Model { get; }
    public ObservableCollection<NoteItemViewModel> Items { get; } = [];
    public string Id => Model.Id;
    public string Title { get => Model.Title; set => Set(value, v => Model.Title = v); }
    public NoteIcon Icon { get => Model.Icon; set => Set(value, v => Model.Icon = v); }
    public double X { get => Model.X; set => Set(value, v => Model.X = v); }
    public double Y { get => Model.Y; set => Set(value, v => Model.Y = v); }
    public double Width { get => Model.Width; set => Set(value, v => Model.Width = v); }
    public double Height { get => Model.Height; set => Set(value, v => Model.Height = v); }
    public string Color { get => Model.Color; set => Set(value, v => Model.Color = v); }
    public double Rotation { get => Model.Rotation; set => Set(value, v => Model.Rotation = v); }
    public string IconGlyph => Icon switch { NoteIcon.Home => "⌂", NoteIcon.Work => "▣", NoteIcon.Book => "▤", NoteIcon.Leaf => "♧", _ => "" };
    public string InkColor => GetInkColor(Color);
    [ObservableProperty] private bool isSelected;

    public NoteViewModel(Note model, Action changed)
    {
        Model = model; _changed = changed;
        foreach (var item in model.Items) Items.Add(new(item, changed));
    }

    private void Set<T>(T value, Action<T> setter, [System.Runtime.CompilerServices.CallerMemberName] string? name = null)
    {
        setter(value); OnPropertyChanged(name);
        if (name == nameof(Icon)) OnPropertyChanged(nameof(IconGlyph));
        if (name == nameof(Color)) OnPropertyChanged(nameof(InkColor));
        if (_interactionActive) _interactionChanged = true; else _changed();
    }

    public void AddItem()
    {
        var item = new NoteItem(); Model.Items.Add(item); Items.Add(new(item, _changed)); _changed();
    }
    public void RemoveItem(NoteItemViewModel item) { Model.Items.Remove(item.Model); Items.Remove(item); _changed(); }
    public void MoveItem(int from, int to)
    {
        if (from == to || from < 0 || to < 0 || from >= Items.Count || to >= Items.Count) return;
        Items.Move(from, to); var model = Model.Items[from]; Model.Items.RemoveAt(from); Model.Items.Insert(to, model); _changed();
    }
    public void Clamp(double boardWidth, double boardHeight)
    {
        var width = Math.Clamp(Width, 80, boardWidth); var height = Math.Clamp(Height, 80, boardHeight);
        var x = Math.Clamp(X, 0, Math.Max(0, boardWidth - width)); var y = Math.Clamp(Y, 0, Math.Max(0, boardHeight - height));
        if (Width != width) Width = width; if (Height != height) Height = height;
        if (X != x) X = x; if (Y != y) Y = y;
    }

    public void BeginInteraction() { _interactionActive = true; _interactionChanged = false; }
    public void EndInteraction()
    {
        _interactionActive = false;
        if (_interactionChanged) { _interactionChanged = false; _changed(); }
    }

    private static string GetInkColor(string color)
    {
        if (color.Length != 7 || color[0] != '#' || !int.TryParse(color[1..], System.Globalization.NumberStyles.HexNumber, null, out var rgb))
            return "#24305E";
        var r = (rgb >> 16) & 255; var g = (rgb >> 8) & 255; var b = rgb & 255;
        var luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance < 0.48 ? "#FFFFFF" : "#24305E";
    }
}
