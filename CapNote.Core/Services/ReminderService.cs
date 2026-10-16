using CapNote.Core.Models;

namespace CapNote.Core.Services;

public sealed class ReminderService : IReminderService
{
    private readonly TimeSpan _initialDelay;
    private readonly TimeSpan _interval;
    private readonly object _gate = new();
    private List<ReminderNote> _pending = [];
    private CancellationTokenSource? _cts;
    private int _index = -1;
    public event EventHandler<ReminderNote>? ReminderDue;

    public ReminderService(TimeSpan? initialDelay = null, TimeSpan? interval = null)
    {
        _initialDelay = initialDelay ?? TimeSpan.FromSeconds(5);
        _interval = interval ?? TimeSpan.FromMinutes(5);
    }

    public void Update(IEnumerable<Note> notes)
    {
        lock (_gate)
            _pending = notes.Select(n => new ReminderNote(n.Id, n.Title,
                n.Items.Where(i => !i.IsCompleted && !string.IsNullOrWhiteSpace(i.Text))
                    .Select(i => new NoteItem { Id = i.Id, Text = i.Text }).ToList()))
                .Where(n => n.Items.Count > 0).ToList();
    }

    public ReminderNote? PickNext()
    {
        lock (_gate)
        {
            if (_pending.Count == 0) return null;
            _index = (_index + 1) % _pending.Count;
            return _pending[_index];
        }
    }

    public void Start()
    {
        Stop();
        _cts = new CancellationTokenSource();
        _ = RunAsync(_cts.Token);
    }

    private async Task RunAsync(CancellationToken token)
    {
        try
        {
            await Task.Delay(_initialDelay, token);
            while (!token.IsCancellationRequested)
            {
                var note = PickNext();
                if (note is not null) ReminderDue?.Invoke(this, note);
                await Task.Delay(_interval, token);
            }
        }
        catch (OperationCanceledException) { }
    }

    public void Stop() { _cts?.Cancel(); _cts?.Dispose(); _cts = null; }
    public void Dispose() => Stop();
}

public sealed class AnimationService : IAnimationService
{
    public AnimationMode GetMode(DateTime localTime) => localTime.Hour is >= 6 and < 22 ? AnimationMode.Work : AnimationMode.Tired;
}
