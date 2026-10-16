using System.Text.Json;
using System.Text.Json.Serialization;
using CapNote.Core.Models;

namespace CapNote.Core.Services;

public sealed class JsonNoteRepository : INoteRepository
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };
    public string DataPath { get; }
    public string BackupPath => Path.Combine(Path.GetDirectoryName(DataPath)!, "notes.backup.json");

    public JsonNoteRepository(string? dataPath = null) => DataPath = dataPath ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CapNote", "data", "notes.json");

    public async Task<AppDataDocument> LoadAsync(CancellationToken cancellationToken = default)
    {
        foreach (var path in new[] { DataPath, BackupPath })
        {
            if (!File.Exists(path)) continue;
            try
            {
                await using var stream = File.OpenRead(path);
                return NoteValidator.Sanitize(await JsonSerializer.DeserializeAsync<AppDataDocument>(stream, Options, cancellationToken));
            }
            catch (Exception) when (path == DataPath && File.Exists(BackupPath)) { }
        }
        return new AppDataDocument();
    }

    public async Task SaveAsync(AppDataDocument document, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(DataPath)!);
        document = NoteValidator.Sanitize(document);
        document.SavedAtUtc = DateTimeOffset.UtcNow;
        var temp = DataPath + ".tmp";
        await using (var stream = new FileStream(temp, FileMode.Create, FileAccess.Write, FileShare.None, 16_384, FileOptions.WriteThrough))
            await JsonSerializer.SerializeAsync(stream, document, Options, cancellationToken);
        if (File.Exists(DataPath)) File.Replace(temp, DataPath, BackupPath, true);
        else File.Move(temp, DataPath);
    }
}
