using System.Text;
using CapNote.Core.Models;
using CapNote.Core.Services;

namespace CapNote.Tests;

public sealed class CoreTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "CapNoteTests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task Repository_RoundTrips_AndCreatesBackup()
    {
        var path = Path.Combine(_root, "notes.json"); var repo = new JsonNoteRepository(path);
        await repo.SaveAsync(new AppDataDocument { Notes = [new Note { Title = "One" }] });
        await repo.SaveAsync(new AppDataDocument { Notes = [new Note { Title = "Two" }] });
        Assert.Equal("Two", (await repo.LoadAsync()).Notes.Single().Title); Assert.True(File.Exists(repo.BackupPath));
    }

    [Fact]
    public async Task Repository_UsesBackup_WhenPrimaryIsCorrupt()
    {
        var path = Path.Combine(_root, "notes.json"); var repo = new JsonNoteRepository(path);
        await repo.SaveAsync(new AppDataDocument { Notes = [new Note { Title = "Safe" }] });
        File.Copy(path, repo.BackupPath, true); await File.WriteAllTextAsync(path, "broken");
        Assert.Equal("Safe", (await repo.LoadAsync()).Notes.Single().Title);
    }

    [Fact]
    public void Validator_ClampsAndRepairsValues()
    {
        var result = NoteValidator.Sanitize(new AppDataDocument { Notes = [new Note { Id = "", Color = "bad", X = 999, Width = 20 }] });
        Assert.NotEmpty(result.Notes[0].Id); Assert.Equal("#F1C40F", result.Notes[0].Color); Assert.Equal(80, result.Notes[0].Width); Assert.Equal(395, result.Notes[0].X);
    }

    [Fact]
    public void Reminder_FiltersAndRotatesPendingNotes()
    {
        using var service = new ReminderService();
        service.Update([new Note { Id = "a", Items = [new NoteItem { Text = "A" }] }, new Note { Id = "b", Items = [new NoteItem { Text = "B" }] }]);
        Assert.Equal("a", service.PickNext()!.NoteId); Assert.Equal("b", service.PickNext()!.NoteId); Assert.Equal("a", service.PickNext()!.NoteId);
    }

    [Theory]
    [InlineData(5, 59, AnimationMode.Tired)][InlineData(6, 0, AnimationMode.Work)]
    [InlineData(21, 59, AnimationMode.Work)][InlineData(22, 0, AnimationMode.Tired)]
    public void Animation_UsesExpectedBoundary(int hour, int minute, AnimationMode expected) =>
        Assert.Equal(expected, new AnimationService().GetMode(new DateTime(2026, 1, 1, hour, minute, 0)));

    [Fact]
    public async Task Migration_ImportsLegacyLog_AndIsIdempotent()
    {
        var legacy = Path.Combine(_root, "legacy"); Directory.CreateDirectory(legacy);
        var json = "[{\"id\":\"n1\",\"title\":\"Old\",\"items\":[{\"id\":\"i1\",\"text\":\"Task\",\"completed\":false}],\"icon\":\"work\",\"x\":5,\"y\":6,\"width\":112,\"height\":112,\"color\":\"#ffccf9\",\"rotation\":0}]";
        await File.WriteAllBytesAsync(Path.Combine(legacy, "000003.log"), Encoding.UTF8.GetBytes("_file://\u0000\u0001roberts-notes\u0003\u0001" + json));
        var repo = new JsonNoteRepository(Path.Combine(_root, "new", "notes.json"));
        var service = new LegacyMigrationService(repo, legacy, Path.Combine(_root, "migration"));
        Assert.Equal(MigrationStatus.Succeeded, (await service.MigrateAsync()).Status); Assert.Equal("Old", (await repo.LoadAsync()).Notes.Single().Title);
        Assert.Equal(MigrationStatus.NotNeeded, (await service.MigrateAsync()).Status);
    }

    [Fact]
    public void Placement_UsesEmptySpaceBeforeFallbackOverlap()
    {
        var service = new NotePlacementService();
        var first = service.FindPosition([], 140, 140);
        var second = service.FindPosition([new Note { X = first.X, Y = first.Y, Width = 140, Height = 140 }], 140, 140);
        Assert.Equal(new BoardPosition(10, 10), first);
        Assert.NotEqual(first, second);
        Assert.True(second.X >= 0 && second.X <= NotePlacementService.BoardWidth - 140);
        Assert.True(second.Y >= 0 && second.Y <= NotePlacementService.BoardHeight - 140);
    }

    [Fact]
    public async Task Settings_RoundTripOnboardingState()
    {
        var path = Path.Combine(_root, "settings", "settings.json");
        var repository = new JsonAppSettingsRepository(path);
        Assert.False((await repository.LoadAsync()).HasCompletedBoardOnboarding);
        await repository.SaveAsync(new AppSettings { HasCompletedBoardOnboarding = true });
        Assert.True((await repository.LoadAsync()).HasCompletedBoardOnboarding);
    }

    public void Dispose() { try { if (Directory.Exists(_root)) Directory.Delete(_root, true); } catch { } }
}
