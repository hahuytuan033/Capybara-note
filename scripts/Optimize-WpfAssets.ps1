param([Parameter(Mandatory=$true)][string]$PublishDirectory)

Add-Type -AssemblyName PresentationCore
$resolved = (Resolve-Path -LiteralPath $PublishDirectory).Path
$assetRoot = Join-Path $resolved 'Assets'
if (-not (Test-Path -LiteralPath $assetRoot)) { throw "Không tìm thấy thư mục asset: $assetRoot" }

Get-ChildItem -LiteralPath $assetRoot -Recurse -Filter '*.png' | Where-Object { $_.Directory.Name -in @('Idle_Work', 'Idle_tired') } | ForEach-Object {
    $inputStream = [IO.File]::OpenRead($_.FullName)
    try {
        $decoder = [Windows.Media.Imaging.PngBitmapDecoder]::new($inputStream, [Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat, [Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
        $source = $decoder.Frames[0]
    } finally { $inputStream.Dispose() }
    if ($source.PixelWidth -le 680) { return }
    $scale = 680.0 / $source.PixelWidth
    $resized = [Windows.Media.Imaging.TransformedBitmap]::new($source, [Windows.Media.ScaleTransform]::new($scale, $scale))
    $encoder = [Windows.Media.Imaging.PngBitmapEncoder]::new(); $encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($resized))
    $outputStream = [IO.File]::Create($_.FullName)
    try { $encoder.Save($outputStream) } finally { $outputStream.Dispose() }
}
