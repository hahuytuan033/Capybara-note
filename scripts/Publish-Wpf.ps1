param([string]$OutputDirectory = (Join-Path $PSScriptRoot '..\artifacts\publish\win-x64'))

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$artifactsRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'artifacts'))
$fullOutput = [IO.Path]::GetFullPath($OutputDirectory)
if ((Test-Path -LiteralPath $fullOutput) -and $fullOutput.StartsWith($artifactsRoot, [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $fullOutput -Recurse -Force
}
dotnet publish (Join-Path $repoRoot 'CapNote.App\CapNote.App.csproj') -c Release -r win-x64 --self-contained true -o $fullOutput
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $PSScriptRoot 'Optimize-WpfAssets.ps1') -PublishDirectory $fullOutput
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$zipPath = Join-Path $artifactsRoot 'CapNote-WPF-x64.zip'
Compress-Archive -Path (Join-Path $fullOutput '*') -DestinationPath $zipPath -CompressionLevel Optimal -Force
$bytes = (Get-ChildItem -LiteralPath $fullOutput -Recurse -File | Measure-Object Length -Sum).Sum
$zipBytes = (Get-Item -LiteralPath $zipPath).Length
Write-Host ("CapNote WPF: {0:N1} MiB raw / {1:N1} MiB ZIP at {2}" -f ($bytes / 1MB), ($zipBytes / 1MB), $fullOutput)
