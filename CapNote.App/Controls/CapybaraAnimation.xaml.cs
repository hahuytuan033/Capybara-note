using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using CapNote.Core.Services;

namespace CapNote.App.Controls;

public partial class CapybaraAnimation : System.Windows.Controls.UserControl, IDisposable
{
    internal const int MaxCachedFrames = 5;
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromMilliseconds(1000d / 12) };
    private readonly IAnimationService _modes = new AnimationService();
    private readonly Dictionary<int, BitmapImage> _cache = [];
    private readonly Dictionary<int, Task<BitmapImage>> _loads = [];
    private readonly LinkedList<int> _lru = [];
    private CancellationTokenSource _prefetchCts = new();
    private string[] _files = [];
    private int _index;
    private AnimationMode? _mode;
    private bool _tickInProgress;
    private bool _disposed;

    public bool IsPlaying => _timer.IsEnabled;
    internal int CachedFrameCount => _cache.Count;

    public CapybaraAnimation()
    {
        InitializeComponent();
        _timer.Tick += OnTick;
        Unloaded += OnUnloaded;
    }

    public void Play()
    {
        if (_disposed || IsPlaying || !IsVisible) return;
        SelectMode(forceRefresh: true);
        _timer.Start();
        _ = ShowCurrentAndPrefetchAsync(_prefetchCts.Token);
    }

    public void Pause()
    {
        if (_disposed) return;
        _timer.Stop();
        CancelPrefetch();
        TrimToCurrentFrame();
    }

    private async void OnTick(object? sender, EventArgs e)
    {
        if (_disposed || !IsPlaying || _tickInProgress || _files.Length == 0) return;
        _tickInProgress = true;
        try
        {
            if (SelectMode(forceRefresh: false))
            {
                await ShowCurrentAndPrefetchAsync(_prefetchCts.Token);
                return;
            }
            var next = (_index + 1) % _files.Length;
            var image = await GetFrameAsync(next, _prefetchCts.Token);
            if (image is null || !IsPlaying) return;
            _index = next; Frame.Source = image; Touch(next); StartPrefetch();
        }
        catch (OperationCanceledException) { }
        finally { _tickInProgress = false; }
    }

    private bool SelectMode(bool forceRefresh)
    {
        var mode = _modes.GetMode(DateTime.Now);
        if (!forceRefresh && _mode == mode) return false;
        if (_mode == mode && _files.Length > 0) return false;
        CancelPrefetch(); _cache.Clear(); _loads.Clear(); _lru.Clear();
        _mode = mode; _index = 0;
        var folder = Path.Combine(AppContext.BaseDirectory, "Assets", mode == AnimationMode.Work ? "Idle_Work" : "Idle_tired");
        _files = Directory.Exists(folder) ? Directory.GetFiles(folder, "*.png").OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToArray() : [];
        return true;
    }

    private async Task ShowCurrentAndPrefetchAsync(CancellationToken token)
    {
        if (_files.Length == 0) return;
        var image = await GetFrameAsync(_index, token);
        if (image is null || !IsPlaying) return;
        Frame.Source = image; Touch(_index); StartPrefetch();
    }

    private void StartPrefetch()
    {
        if (!IsPlaying || _files.Length == 0) return;
        var token = _prefetchCts.Token;
        for (var offset = 1; offset < MaxCachedFrames; offset++)
        {
            var frameIndex = (_index + offset) % _files.Length;
            _ = PrefetchAsync(frameIndex, token);
        }
    }

    private async Task PrefetchAsync(int index, CancellationToken token)
    {
        try { await GetFrameAsync(index, token); }
        catch (OperationCanceledException) { }
    }

    private async Task<BitmapImage?> GetFrameAsync(int index, CancellationToken token)
    {
        token.ThrowIfCancellationRequested();
        if (_cache.TryGetValue(index, out var cached)) { Touch(index); return cached; }
        if (!_loads.TryGetValue(index, out var load))
        {
            var path = _files[index]; var decodeWidth = GetDecodeWidth();
            load = Task.Run(() => Load(path, decodeWidth, token), token); _loads[index] = load;
        }
        BitmapImage? image;
        try { image = await load; }
        finally
        {
            if (_loads.TryGetValue(index, out var currentLoad) && ReferenceEquals(currentLoad, load))
                _loads.Remove(index);
        }
        if (image is null || token.IsCancellationRequested || _disposed) return null;
        _cache[index] = image; Touch(index); EvictIfNeeded(); return image;
    }

    private int GetDecodeWidth()
    {
        var logicalWidth = ActualWidth > 0 ? ActualWidth : 340;
        return Math.Clamp((int)Math.Ceiling(logicalWidth * VisualTreeHelper.GetDpi(this).DpiScaleX), 340, 680);
    }

    private static BitmapImage Load(string path, int decodeWidth, CancellationToken token)
    {
        token.ThrowIfCancellationRequested();
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 16_384, FileOptions.SequentialScan);
        var image = new BitmapImage(); image.BeginInit(); image.CacheOption = BitmapCacheOption.OnLoad;
        image.DecodePixelWidth = decodeWidth; image.StreamSource = stream; image.EndInit(); image.Freeze();
        token.ThrowIfCancellationRequested(); return image;
    }

    private void Touch(int index) { _lru.Remove(index); _lru.AddLast(index); }
    private void EvictIfNeeded()
    {
        while (_cache.Count > MaxCachedFrames && _lru.First is not null)
        {
            var victim = _lru.First.Value; _lru.RemoveFirst();
            if (victim == _index) { _lru.AddLast(victim); continue; }
            _cache.Remove(victim);
        }
    }
    private void TrimToCurrentFrame()
    {
        if (!_cache.TryGetValue(_index, out var current)) { _cache.Clear(); _lru.Clear(); return; }
        _cache.Clear(); _lru.Clear(); _cache[_index] = current; _lru.AddLast(_index);
    }
    private void CancelPrefetch()
    {
        _prefetchCts.Cancel(); _prefetchCts.Dispose(); _prefetchCts = new CancellationTokenSource(); _loads.Clear();
    }
    private void OnUnloaded(object sender, RoutedEventArgs e) => Pause();

    public void Dispose()
    {
        if (_disposed) return;
        Pause(); _disposed = true; _timer.Tick -= OnTick; Unloaded -= OnUnloaded;
        _prefetchCts.Cancel(); _prefetchCts.Dispose(); _cache.Clear(); _loads.Clear(); _lru.Clear(); Frame.Source = null;
    }
}
