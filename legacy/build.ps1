Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$source = Join-Path $projectRoot 'DesktopReminderApp.cs'
$icon = Join-Path $projectRoot 'assets\cat-head.ico'
$outputDirectory = Join-Path $projectRoot 'dist'
$output = Join-Path $outputDirectory 'DesktopReminder.exe'
$framework64 = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$framework32 = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
$compiler = if (Test-Path -LiteralPath $framework64) { $framework64 } else { $framework32 }

if (-not (Test-Path -LiteralPath $compiler)) {
    throw 'Could not find the .NET Framework C# compiler (csc.exe).'
}
if (-not (Test-Path -LiteralPath $source)) {
    throw 'Could not find DesktopReminderApp.cs.'
}
if (-not (Test-Path -LiteralPath $icon)) {
    throw 'Could not find assets\cat-head.ico.'
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

& $compiler `
    /nologo `
    /target:winexe `
    "/win32icon:$icon" `
    /reference:System.Windows.Forms.dll `
    /reference:System.Drawing.dll `
    /reference:System.Runtime.Serialization.dll `
    "/out:$output" `
    $source

if ($LASTEXITCODE -ne 0) {
    throw "Compilation failed with exit code $LASTEXITCODE."
}

$assetOutput = Join-Path $outputDirectory 'assets'
New-Item -ItemType Directory -Path $assetOutput -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'assets\cat-head.ico') -Destination $assetOutput -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'assets\cat-head.png') -Destination $assetOutput -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'assets\stretch.gif') -Destination $assetOutput -Force

Write-Host "Build completed: $output" -ForegroundColor Green

