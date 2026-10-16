using System.Text.Json;
using CapNote.Core.Models;

namespace CapNote.Core.Services;

public sealed class JsonAppSettingsRepository : IAppSettingsRepository
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    public string SettingsPath { get; }

    public JsonAppSettingsRepository(string? settingsPath = null) => SettingsPath = settingsPath ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CapNote", "data", "settings.json");

    public async Task<AppSettings> LoadAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(SettingsPath)) return new();
        try
        {
            await using var stream = File.OpenRead(SettingsPath);
            return await JsonSerializer.DeserializeAsync<AppSettings>(stream, Options, cancellationToken) ?? new();
        }
        catch (JsonException) { return new(); }
        catch (IOException) { return new(); }
    }

    public async Task SaveAsync(AppSettings settings, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(SettingsPath)!);
        var temp = SettingsPath + ".tmp";
        await using (var stream = new FileStream(temp, FileMode.Create, FileAccess.Write, FileShare.None, 4_096, FileOptions.WriteThrough))
            await JsonSerializer.SerializeAsync(stream, settings, Options, cancellationToken);
        File.Move(temp, SettingsPath, true);
    }
}
