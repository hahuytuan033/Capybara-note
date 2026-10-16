using System.Text.Json.Serialization;

namespace CapNote.Core.Models;

[JsonConverter(typeof(JsonStringEnumConverter<NoteIcon>))]
public enum NoteIcon { None, Home, Work, Book, Leaf }

public sealed class NoteItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Text { get; set; } = "";
    public bool IsCompleted { get; set; }
}

public sealed class Note
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = "today's focus";
    public List<NoteItem> Items { get; set; } = [];
    public NoteIcon Icon { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; } = 140;
    public double Height { get; set; } = 140;
    public string Color { get; set; } = "#F1C40F";
    public double Rotation { get; set; }

    public Note Clone() => new()
    {
        Id = Id, Title = Title, Icon = Icon, X = X, Y = Y, Width = Width,
        Height = Height, Color = Color, Rotation = Rotation,
        Items = Items.Select(x => new NoteItem { Id = x.Id, Text = x.Text, IsCompleted = x.IsCompleted }).ToList()
    };
}

public sealed class AppDataDocument
{
    public int SchemaVersion { get; set; } = 1;
    public List<Note> Notes { get; set; } = [];
    public DateTimeOffset SavedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class AppSettings
{
    public bool HasCompletedBoardOnboarding { get; set; }
}
