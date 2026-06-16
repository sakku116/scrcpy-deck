# ScrcpyDeck

**Mirror and control your Android device — entirely from the browser.**

[![Release](https://img.shields.io/github/v/release/sakku116/scrcpy-deck?style=flat-square)](https://github.com/sakku116/scrcpy-deck/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey?style=flat-square)]()

ScrcpyDeck wraps [scrcpy](https://github.com/Genymobile/scrcpy) and
[ws-scrcpy](https://github.com/NetrisTV/ws-scrcpy) into a clean web UI with a
wireless connection wizard. No ADB knowledge needed. No app on the phone.
Plug in once, go wireless forever.

---

## Features

- **Browser-based** — works in any browser on the same network, no native client needed
- **Wireless after first connect** — USB only for the initial handshake; everything else is Wi-Fi
- **Android 11+ pairing** — connect without USB using the wireless debugging pairing code
- **Device history** — previously connected devices reconnect in one click
- **Zero config** — bundled ADB, no PATH setup required

---

## Install

### One-liner (PowerShell)

```powershell
irm https://raw.githubusercontent.com/sakku116/scrcpy-deck/master/scripts/install.ps1 | iex
```

Downloads the latest release and adds `scrcpy-deck` to your PATH. Open a new terminal when done.

### Manual

Download the latest zip from the [**Releases page**](https://github.com/sakku116/scrcpy-deck/releases/latest), extract anywhere, and run `ScrcpyDeck.exe`.

---

## Usage

```
scrcpy-deck
```

```
ScrcpyDeck is running.

  Open in your browser:

    http://localhost:8000
    http://192.168.1.x:8000
```

Open the URL in any browser on the same network. Done.

---

## Connect a device

### Classic — USB once, wireless forever

1. Plug the phone into USB and accept the **Allow USB debugging** prompt.
2. In the browser, click **+ Add device → Classic (USB once) → Enable Wi-Fi & connect**.
3. Unplug. The device stays connected over Wi-Fi and reconnects automatically on the next launch.

### Android 11+ — no USB needed

Enable **Wireless debugging** in Developer Options on your phone, then click
**+ Add device → Android 11+ (pairing code)** and follow the on-screen steps.

---

## Requirements

| | |
|---|---|
| OS | Windows 10 / 11 (64-bit) |
| Phone | Android 5.0+ with USB debugging enabled |
| Network | Phone and PC on the same Wi-Fi network |

> **Note:** For the Android 11+ wireless pairing flow, **Wireless debugging** must be enabled in Developer Options.

---

## Build from source

```bash
git clone https://github.com/sakku116/scrcpy-deck.git
cd scrcpy-deck
npm install
npm run setup:adb    # downloads ADB for your platform
npm run dist:dev     # development build + watch
npm start            # production build + server
```

---

## Troubleshooting

**Device not detected after plugging in USB**
Make sure USB debugging is enabled in Developer Options and you accepted the "Allow USB debugging" prompt on your phone.

**Can't connect wirelessly after USB setup**
Ensure both your phone and PC are on the same Wi-Fi network. Some routers block device-to-device traffic (AP isolation) — try a different network or hotspot.

**Port 8000 already in use**
Set a custom port: `scrcpy-deck --port 8080`

---

## Credits

ScrcpyDeck builds on the shoulders of:

- [**scrcpy**](https://github.com/Genymobile/scrcpy) by Genymobile — the engine that streams and controls Android devices over ADB
- [**ws-scrcpy**](https://github.com/NetrisTV/ws-scrcpy) by NetrisTV — the WebSocket bridge that brings scrcpy into the browser

---

## License

MIT — see [LICENSE](LICENSE).

<sub>Platform: Windows · Android · Wireless ADB</sub>
