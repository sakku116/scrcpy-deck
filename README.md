# ScrcpyDeck

Mirror and control Android devices from your browser. No app to install on the phone.

---

## Install

### Option A — one command (Windows)

```powershell
irm https://raw.githubusercontent.com/sakku116/scrcpy-deck/master/scripts/install.ps1 | iex
```

Then run from any terminal:

```
scrcpy-deck
```

### Option B — download the exe

[**→ Latest release**](https://github.com/sakku116/scrcpy-deck/releases/latest)

Download `ScrcpyDeck-vX.Y.Z-win-x64.zip`, extract, run `ScrcpyDeck.exe`.

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

Open the URL. That's it.

---

## Connect a device

**Wireless (no USB after setup)**

1. Plug the phone in over USB and accept the *Allow USB debugging* prompt.
2. Click **+ Add device** → **Classic (USB once)** → **Enable Wi-Fi & connect**.
3. Unplug the cable. The device stays connected over Wi-Fi.

Next time you start ScrcpyDeck, the device reconnects automatically.

**Android 11+ pairing code**

Click **+ Add device** → **Android 11+ (pairing code)** and follow the on-screen steps.

---

## Requirements

- Windows 10/11
- Android device with USB debugging enabled (Developer Options)
- Phone and PC on the same Wi-Fi network (for wireless)

---

## Security

ScrcpyDeck runs a local server accessible only on your network. To block all
access to the phone: turn off *USB debugging* in Developer Options. ADB
connections drop immediately.

---

## Build from source

```bash
git clone https://github.com/sakku116/scrcpy-deck.git
cd scrcpy-deck
npm install
npm run setup:adb
npm run dist:dev      # dev build
npm start             # prod build + start
```

---

Built on top of [ws-scrcpy](https://github.com/NetrisTV/ws-scrcpy).
