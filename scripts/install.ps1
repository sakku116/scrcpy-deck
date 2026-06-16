# ScrcpyDeck installer for Windows
# Usage: irm https://raw.githubusercontent.com/sakku116/scrcpy-deck/master/scripts/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$installDir = "$env:LOCALAPPDATA\scrcpy-deck"

Write-Host "`nScrcpyDeck installer`n" -ForegroundColor Cyan

# Fetch latest release
Write-Host "Checking latest release..."
$release = Invoke-RestMethod "https://api.github.com/repos/sakku116/scrcpy-deck/releases/latest"
$version = $release.tag_name
$asset = $release.assets | Where-Object { $_.name -like "*win-x64*.zip" } | Select-Object -First 1
if (-not $asset) { Write-Error "No Windows release asset found for $version."; exit 1 }

Write-Host "Downloading $($asset.name) ($version)..."
$zip = "$env:TEMP\scrcpy-deck-$version.zip"
Invoke-WebRequest $asset.browser_download_url -OutFile $zip

Write-Host "Installing to $installDir..."
if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force }
Expand-Archive $zip -DestinationPath $installDir
Remove-Item $zip

# Add to user PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$installDir", "User")
    Write-Host "Added $installDir to PATH."
}

Write-Host "`nDone! Open a new terminal and run:" -ForegroundColor Green
Write-Host "  scrcpy-deck`n" -ForegroundColor White
