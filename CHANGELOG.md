# Changelog

All notable changes to ScrcpyDeck are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [0.6.0] — 2026-06-17

### Features
- `scrcpy-deck help` / `--help` / `-h` prints all supported commands and flags
- `scrcpy-deck uninstall` prints one-liner uninstall instructions

### Fixes
- `scrcpy-server.jar` now resolved from exe directory when packaged — fixes device mirroring on USB connect
- `install.ps1` starts ADB daemon during install so first `scrcpy-deck` run works without errors
- `uninstall.ps1` kills ScrcpyDeck process before removing files — fixes "Access denied" on exe
- ADB start-server now uses a warmup call to handle Windows first-run scan edge cases

---

## [0.5.0] — 2026-06-17

### Features
- ADB daemon is now stopped automatically when ScrcpyDeck shuts down (Ctrl+C)

### Fixes
- `uninstall.ps1` now kills the ADB daemon before removing files, fixing "Access denied" on `adb.exe`

---

## [0.4.0] — 2026-06-17

### Features
- Added `uninstall.ps1` — one-liner uninstall via `irm …/uninstall.ps1 | iex`, with prompt to keep or delete user data

### Fixes
- `install.ps1` now unblocks bundled `adb.exe` and DLLs after extract so ADB starts automatically without user intervention
- Server exit handler now logs correct signal name (`SIGINT`/`SIGTERM`) instead of `undefined`

---

## [0.3.0] — 2026-06-16

### Features
- `scrcpy-deck --version` prints current version and exits
- `scrcpy-deck update` checks GitHub releases API and prints upgrade instructions when a newer version is available
- Server prints a one-time console notice on startup if a newer version exists
- `/api/version` REST endpoint — returns `{ current, latest, updateAvailable }`
- Web UI shows a dismissible banner when a new version is available (covers script-installed and manual exe users)

### Fixes
- User data (`devices.json`, `config.yaml`) now stored in `%APPDATA%\ScrcpyDeck` instead of adjacent to the exe — data survives updates without loss
- `install.ps1` automatically migrates data from the legacy location on first update

### Docs
- Rewrote README with badges, Features section, Troubleshooting, and License
- Updated SECURITY.md to reflect project ownership and scope

---

## [0.2.1] — 2026-06-16

### Docs
- Rewrote README with proper intro, credits, and cleaner structure

---

## [0.2.0] — 2026-06-16

### Features
- Added PowerShell install script (`install.ps1`) — one-liner install via `irm … | iex`
- Added `scrcpy-deck` CLI launcher (`.bat`) — adds folder to PATH so the command works from any terminal
- Cleaned up startup output; removed auto-open browser behavior

---

## [0.1.4] — 2026-06-16

### Fixes
- Added `contents:write` permission to GitHub Actions release workflow
- Replaced `import.meta.dirname` with `fileURLToPath` for Node 18 compatibility
- Switched to `pkg@5` with `node18-win-x64` target for prebuilt exe binaries

### Chores
- Added `@yao-pkg/pkg` as dev dependency for exe builds
- Added GitHub Actions release workflow

---

## [0.1.0] — 2026-06-16

Initial public release — ScrcpyDeck forked from [ws-scrcpy](https://github.com/NetrisTV/ws-scrcpy), bundled with wireless connection wizard and Windows exe packaging.
