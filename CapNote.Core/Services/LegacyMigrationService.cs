using System.Text;
using System.Text.Json;
using CapNote.Core.Models;

namespace CapNote.Core.Services;

public sealed class LegacyMigrationService : ILegacyMigrationService
{
    private const string StorageKey = "roberts-notes";
    private readonly INoteRepository _repository;
    private readonly string _legacyDirectory;
    private readonly string _migrationDirectory;

    public LegacyMigrationService(INoteRepository repository, string? legacyDirectory = null, string? migrationDirectory = null)
    {
        _repository = repository;
        _legacyDirectory = legacyDirectory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "capybara-note", "Local Storage", "leveldb");
        _migrationDirectory = migrationDirectory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "CapNote", "migration");
    }

    public async Task<MigrationResult> MigrateAsync(CancellationToken cancellationToken = default)
    {
        var marker = Path.Combine(_migrationDirectory, "electron-v1.complete");
        if (File.Exists(_repository.DataPath) || File.Exists(marker)) return new(MigrationStatus.NotNeeded);
        if (!Directory.Exists(_legacyDirectory)) return new(MigrationStatus.NotNeeded);

        var snapshot = Path.Combine(Path.GetTempPath(), "CapNoteMigration", Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(snapshot);
            foreach (var source in Directory.EnumerateFiles(_legacyDirectory))
            {
                cancellationToken.ThrowIfCancellationRequested();
                try { File.Copy(source, Path.Combine(snapshot, Path.GetFileName(source)), true); }
                catch (IOException ex) { return new(MigrationStatus.SourceLocked, "Hãy đóng CapNote Electron rồi thử lại: " + ex.Message); }
            }

            var candidates = new List<(int OriginRank, DateTime Modified, int Sequence, string Json)>();
            foreach (var file in Directory.EnumerateFiles(snapshot).Where(IsLevelDbDataFile))
            {
                var bytes = await File.ReadAllBytesAsync(file, cancellationToken);
                var sequence = 0;
                candidates.AddRange(ExtractCandidates(bytes).Select(c => (c.OriginRank, File.GetLastWriteTimeUtc(file), sequence++, c.Json)));
            }

            foreach (var candidate in candidates.OrderBy(c => c.OriginRank).ThenByDescending(c => c.Modified).ThenByDescending(c => c.Sequence))
            {
                if (!TryDeserializeLegacy(candidate.Json, out var notes)) continue;
                var document = NoteValidator.Sanitize(new AppDataDocument { Notes = notes });
                Directory.CreateDirectory(_migrationDirectory);
                await File.WriteAllTextAsync(Path.Combine(_migrationDirectory, "electron-roberts-notes.json"), candidate.Json, cancellationToken);
                await _repository.SaveAsync(document, cancellationToken);
                await File.WriteAllTextAsync(marker, DateTimeOffset.UtcNow.ToString("O"), cancellationToken);
                return new(MigrationStatus.Succeeded, "Đã chuyển dữ liệu từ CapNote Electron.", document.Notes.Count);
            }
            return new(MigrationStatus.Failed, "Đã tìm thấy profile Electron nhưng không đọc được dữ liệu notes. Dữ liệu cũ vẫn được giữ nguyên.");
        }
        catch (UnauthorizedAccessException ex) { return new(MigrationStatus.SourceLocked, ex.Message); }
        catch (Exception ex) { return new(MigrationStatus.Failed, ex.Message); }
        finally { try { if (Directory.Exists(snapshot)) Directory.Delete(snapshot, true); } catch { } }
    }

    private static bool IsLevelDbDataFile(string path) => Path.GetExtension(path).ToLowerInvariant() is ".log" or ".ldb" or ".sst";

    internal static IEnumerable<(int OriginRank, string Json)> ExtractCandidates(byte[] bytes)
    {
        var key = Encoding.UTF8.GetBytes(StorageKey);
        for (var i = 0; i <= bytes.Length - key.Length; i++)
        {
            if (!bytes.AsSpan(i, key.Length).SequenceEqual(key)) continue;
            var contextStart = Math.Max(0, i - 160);
            var context = Encoding.UTF8.GetString(bytes, contextStart, i - contextStart);
            var rank = context.Contains("_file://", StringComparison.Ordinal) ? 0 :
                context.Contains("_http://localhost:3000", StringComparison.Ordinal) ? 1 : 2;
            foreach (var json in FindJsonArrays(bytes, i + key.Length, Math.Min(bytes.Length, i + key.Length + 1_000_000)))
                yield return (rank, json);
        }
    }

    private static IEnumerable<string> FindJsonArrays(byte[] bytes, int start, int end)
    {
        foreach (var utf16 in new[] { false, true })
        {
            var step = utf16 ? 2 : 1;
            for (var i = start; i < Math.Min(end, start + 64); i++)
            {
                if (bytes[i] != (byte)'[') continue;
                var depth = 0; var quoted = false; var escaped = false;
                for (var j = i; j < end; j += step)
                {
                    if (utf16 && (j + 1 >= end || bytes[j + 1] != 0)) break;
                    var ch = (char)bytes[j];
                    if (quoted) { if (escaped) escaped = false; else if (ch == '\\') escaped = true; else if (ch == '"') quoted = false; }
                    else if (ch == '"') quoted = true;
                    else if (ch is '[' or '{') depth++;
                    else if (ch is ']' or '}') { depth--; if (depth == 0) { var length = j - i + step; yield return utf16 ? Encoding.Unicode.GetString(bytes, i, length) : Encoding.UTF8.GetString(bytes, i, length); break; } }
                }
            }
        }
    }

    private sealed class LegacyNote
    {
        public string? Id { get; set; } public string? Title { get; set; } public List<LegacyItem>? Items { get; set; }
        public string? Icon { get; set; } public double X { get; set; } public double Y { get; set; }
        public double Width { get; set; } = 112; public double Height { get; set; } = 112;
        public string? Color { get; set; } public double Rotation { get; set; }
    }
    private sealed class LegacyItem { public string? Id { get; set; } public string? Text { get; set; } public bool Completed { get; set; } }

    private static bool TryDeserializeLegacy(string json, out List<Note> notes)
    {
        notes = [];
        try
        {
            using var parsed = JsonDocument.Parse(json);
            if (parsed.RootElement.ValueKind != JsonValueKind.Array) return false;
            if (parsed.RootElement.GetArrayLength() > 0)
            {
                var first = parsed.RootElement[0];
                if (first.ValueKind != JsonValueKind.Object ||
                    !(first.TryGetProperty("title", out _) || first.TryGetProperty("items", out _) || first.TryGetProperty("color", out _))) return false;
            }
            var legacy = JsonSerializer.Deserialize<List<LegacyNote>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (legacy is null) return false;
            notes = legacy.Select(n => new Note
            {
                Id = n.Id ?? "", Title = n.Title ?? "", Items = n.Items?.Select(i => new NoteItem
                    { Id = i.Id ?? "", Text = i.Text ?? "", IsCompleted = i.Completed }).ToList() ?? [],
                Icon = Enum.TryParse<NoteIcon>(n.Icon, true, out var icon) ? icon : NoteIcon.None,
                X = n.X, Y = n.Y, Width = n.Width, Height = n.Height, Color = n.Color ?? "#F1C40F", Rotation = n.Rotation
            }).ToList();
            return true;
        }
        catch (JsonException) { return false; }
    }
}
