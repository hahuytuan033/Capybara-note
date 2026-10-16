using System.Text.RegularExpressions;
using CapNote.Core.Models;

namespace CapNote.Core.Services;

public static partial class NoteValidator
{
    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    private static partial Regex ColorRegex();

    public static AppDataDocument Sanitize(AppDataDocument? source)
    {
        var result = new AppDataDocument { SchemaVersion = 1 };
        if (source?.Notes is null) return result;
        foreach (var note in source.Notes.Where(n => n is not null))
        {
            note.Id = string.IsNullOrWhiteSpace(note.Id) ? Guid.NewGuid().ToString("N") : note.Id[..Math.Min(note.Id.Length, 128)];
            note.Title = (note.Title ?? "")[..Math.Min((note.Title ?? "").Length, 500)];
            note.Color = ColorRegex().IsMatch(note.Color ?? "") ? note.Color! : "#F1C40F";
            note.Width = ClampFinite(note.Width, 80, 475, 112);
            note.Height = ClampFinite(note.Height, 80, 450, 112);
            note.X = ClampFinite(note.X, 0, Math.Max(0, 475 - note.Width), 0);
            note.Y = ClampFinite(note.Y, 0, Math.Max(0, 450 - note.Height), 0);
            note.Rotation = ClampFinite(note.Rotation, -10, 10, 0);
            note.Items ??= [];
            foreach (var item in note.Items)
            {
                item.Id = string.IsNullOrWhiteSpace(item.Id) ? Guid.NewGuid().ToString("N") : item.Id[..Math.Min(item.Id.Length, 128)];
                item.Text = (item.Text ?? "")[..Math.Min((item.Text ?? "").Length, 2_000)];
            }
            result.Notes.Add(note);
        }
        return result;
    }

    private static double ClampFinite(double value, double min, double max, double fallback) =>
        double.IsFinite(value) ? Math.Clamp(value, min, max) : fallback;
}
