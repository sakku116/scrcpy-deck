# ScrcpyDeck uninstaller for Windows
# Usage: irm https://raw.githubusercontent.com/sakku116/scrcpy-deck/master/scripts/uninstall.ps1 | iex

$ErrorActionPreference = 'Stop'
$installDir = "$env:LOCALAPPDATA\scrcpy-deck"
$dataDir    = "$env:APPDATA\ScrcpyDeck"

Write-Host "`nScrcpyDeck uninstaller`n" -ForegroundColor Cyan

if (-not (Test-Path $installDir)) {
    Write-Host "ScrcpyDeck is not installed." -ForegroundColor Yellow
    exit 0
}

$keepData = Read-Host "Keep user data (devices, config)? [Y/n]"
if ($keepData -eq '' -or $keepData -match '^[Yy]') {
    $keepData = $true
} else {
    $keepData = $false
}

$adbExe = "$installDir\vendor\win\adb.exe"
if (Test-Path $adbExe) {
    Write-Host "Stopping ADB daemon..."
    try { & $adbExe kill-server 2>$null } catch {}
}

Write-Host "Removing $installDir..."
Remove-Item $installDir -Recurse -Force

$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -like "*$installDir*") {
    $newPath = ($currentPath -split ';' | Where-Object { $_ -ne $installDir }) -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "Removed from PATH."
}

if (-not $keepData -and (Test-Path $dataDir)) {
    Write-Host "Removing user data at $dataDir..."
    Remove-Item $dataDir -Recurse -Force
}

Write-Host "`nDone! ScrcpyDeck has been uninstalled." -ForegroundColor Green
