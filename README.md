# ScrcpyDeck

**Mirror and control your Android device — entirely from the browser.**

ScrcpyDeck wraps [scrcpy](https://github.com/Genymobile/scrcpy) and
[ws-scrcpy](https://github.com/NetrisTV/ws-scrcpy) into a clean web UI.
No ADB knowledge needed, no app on the phone — plug in once, go wireless forever.

---

## Install

### PowerShell (one line)

```powershell
irm https://raw.githubusercontent.com/sakku116/scrcpy-deck/master/scripts/install.ps1 | iex
```

Downloads the latest release and adds `scrcpy-deck` to your PATH.
Open a new terminal when done.

### Manual (Windows exe)

Download the latest zip from the [**Releases page**](https://github.com/sakku116/scrcpy-deck/releases/latest),
extract it anywhere, and run `ScrcpyDeck.exe`.

---

## Start

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

### Android 11+ — pairing code, no USB

Enable **Wireless debugging** in Developer Options, then click
**+ Add device → Android 11+ (pairing code)** and follow the steps.

---

## Requirements

| | |
|---|---|
| OS | Windows 10 / 11 |
| Phone | Android 5+ with USB debugging enabled |
| Network | Phone and PC on the same Wi-Fi |

---

## Build from source

```bash
git clone https://github.com/sakku116/scrcpy-deck.git
cd scrcpy-deck
npm install
npm run setup:adb   # downloads adb for your platform
npm run dist:dev    # development build + watch
npm start           # production build + server
```

---

## Credits

ScrcpyDeck builds on the shoulders of:

- [**scrcpy**](https://github.com/Genymobile/scrcpy) by Genymobile — the engine that streams and controls Android devices over ADB.
- [**ws-scrcpy**](https://github.com/NetrisTV/ws-scrcpy) by NetrisTV — the WebSocket bridge that brings scrcpy into the browser.

---

<sub>Platform: Windows · Android · Wireless ADB</sub>
