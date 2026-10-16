using CapNote.Core.Models;

namespace CapNote.Core.Services;

public sealed class NotePlacementService : INotePlacementService
{
    public const double BoardWidth = 475;
    public const double BoardHeight = 450;
    public const double GridSize = 20;
    private const double MaximumOverlapRatio = 0.10;

    public BoardPosition FindPosition(IEnumerable<Note> notes, double noteWidth, double noteHeight)
    {
        var existing = notes.ToList();
        for (double y = 10; y <= BoardHeight - noteHeight; y += GridSize)
            for (double x = 10; x <= BoardWidth - noteWidth; x += GridSize)
                if (existing.All(note => OverlapRatio(x, y, noteWidth, noteHeight, note) <= MaximumOverlapRatio))
                    return new(x, y);

        var offset = (existing.Count % 6) * 12;
        return new(
            Math.Clamp((BoardWidth - noteWidth) / 2 + offset - 30, 0, BoardWidth - noteWidth),
            Math.Clamp((BoardHeight - noteHeight) / 2 + offset - 30, 0, BoardHeight - noteHeight));
    }

    private static double OverlapRatio(double x, double y, double width, double height, Note other)
    {
        var overlapWidth = Math.Max(0, Math.Min(x + width, other.X + other.Width) - Math.Max(x, other.X));
        var overlapHeight = Math.Max(0, Math.Min(y + height, other.Y + other.Height) - Math.Max(y, other.Y));
        return overlapWidth * overlapHeight / (width * height);
    }
}
