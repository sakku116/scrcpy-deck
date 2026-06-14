# ScrcpyDeck

A web UI wrapper for [scrcpy](https://github.com/Genymobile/scrcpy): mirror and
control an Android device **inside your browser** and connect over Wi-Fi through
a guided wizard — no command line required.

ScrcpyDeck is built on top of [ws-scrcpy](https://github.com/NetrisTV/ws-scrcpy)
(the in-browser mirroring engine) and adds a **Wireless Connect Wizard**,
bundled `adb`, and end-user friendly packaging.

> **Disclaimer:** ScrcpyDeck is **not affiliated with, endorsed by, or sponsored
> by** the official scrcpy project (Genymobile) or the ws-scrcpy project. See
> [`NOTICE`](NOTICE) for third-party attributions.

## Features

- 🪞 **In-browser mirroring** — H264 video with WebCodecs / MSE / Broadway / TinyH264 decoders.
- 📶 **Wireless Connect Wizard** with two flows:
  - **Classic** — `adb tcpip` over a USB cable once, then connect over Wi-Fi.
  - **Android 11+** — pair with a 6-digit code, no USB ever needed.
- 🎮 Touch & keyboard control from the browser.
- 📦 Bundled `scrcpy-server.jar`; `adb` fetched into `vendor/` via one command.

## Prerequisites

- Node.js 20+ (developed on Node 24).
- `adb` — bundled via `npm run setup:adb`, or available on `PATH`, or pointed to
  by the `SCRCPY_DECK_ADB` environment variable.
- An Android device with **USB debugging** (and **Wireless debugging** for the
  Android 11+ flow) enabled.

## Quick start (development)

```bash
npm install
npm run setup:adb      # downloads adb into vendor/<platform>/
npm start              # builds and serves on http://localhost:8000
```

Open <http://localhost:8000>, click **+ Connect Wireless**, and follow the wizard.
See [`docs/wireless-flows.md`](docs/wireless-flows.md) for the exact steps and
troubleshooting.

## Run with Docker

Wireless connections are a first-class fit for Docker (network-only adb).

```bash
docker compose up --build      # serves on http://localhost:8000
```

| Host OS            | Classic (USB once)        | Android 11+ pairing (no USB) |
| ------------------ | ------------------------- | ---------------------------- |
| Linux              | ✅ with `--device`/host net | ✅                            |
| Windows / macOS    | ⚠️ USB passthrough unsupported — do the `adb tcpip` step on the host | ✅ |

For mDNS auto-discovery during pairing, run with `--network host` on Linux.

## Packaging a single Windows .exe

```bash
npm run build:exe      # produces dist-exe/ScrcpyDeck.exe (+ vendor/)
```

Double-clicking the exe starts the server and opens the browser automatically.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — layers and module responsibilities.
- [`docs/wireless-flows.md`](docs/wireless-flows.md) — connection flows, adb commands, troubleshooting.
- [`docs/contributing.md`](docs/contributing.md) — conventions, linting, commits.

## License

MIT — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
