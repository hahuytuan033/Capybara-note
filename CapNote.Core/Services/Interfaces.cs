using CapNote.Core.Models;

namespace CapNote.Core.Services;

public interface INoteRepository
{
    string DataPath { get; }
    Task<AppDataDocument> LoadAsync(CancellationToken cancellationToken = default);
    Task SaveAsync(AppDataDocument document, CancellationToken cancellationToken = default);
}

public interface IAppSettingsRepository
{
    string SettingsPath { get; }
    Task<AppSettings> LoadAsync(CancellationToken cancellationToken = default);
    Task SaveAsync(AppSettings settings, CancellationToken cancellationToken = default);
}

public readonly record struct BoardPosition(double X, double Y);
public interface INotePlacementService
{
    BoardPosition FindPosition(IEnumerable<Note> notes, double noteWidth, double noteHeight);
}

public enum MigrationStatus { NotNeeded, Succeeded, Failed, SourceLocked }
public sealed record MigrationResult(MigrationStatus Status, string? Message = null, int ImportedCount = 0);

public interface ILegacyMigrationService
{
    Task<MigrationResult> MigrateAsync(CancellationToken cancellationToken = default);
}

public sealed record ReminderNote(string NoteId, string Title, IReadOnlyList<NoteItem> Items);

public interface IReminderService : IDisposable
{
    event EventHandler<ReminderNote>? ReminderDue;
    void Update(IEnumerable<Note> notes);
    void Start();
    void Stop();
    ReminderNote? PickNext();
}

public enum AnimationMode { Work, Tired }
public interface IAnimationService
{
    AnimationMode GetMode(DateTime localTime);
}
