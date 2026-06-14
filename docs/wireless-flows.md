# Wireless connection flows

ScrcpyDeck exposes two ways to connect a device over Wi-Fi, both driven from the
**+ Connect Wireless** wizard on the dashboard. All steps map to plain `adb`
commands run by the backend (`src/server/wireless/WirelessService.ts`).

## Classic flow (USB once) — based on the rorosaurus tutorial

Requires plugging the phone in over USB a single time.

| Step | UI action            | adb command run by the server                          |
| ---- | -------------------- | ------------------------------------------------------ |
| 1    | Plug in USB, allow debugging | (device appears in `adb devices`)              |
| 2    | "Enable Wi-Fi & connect"     | `adb -s <serial> tcpip 5555`                   |
| 3    | (automatic)          | `adb -s <serial> shell ip -f inet addr show wlan0` → IP |
| 4    | (automatic)          | `adb connect <ip>:5555`                                |
| 5    | Unplug USB           | device stays connected over Wi-Fi                      |

REST: `POST /api/wireless/tcpip { serial?, port? }` performs steps 2–4 and
returns `{ ip, target, connected }`.

## Android 11+ flow (no USB)

Uses the built-in **Wireless debugging** pairing.

1. On the phone: **Settings → Developer options → Wireless debugging → On**.
2. Tap **Pair device with pairing code**. Note the **IP:pairingPort** and the
   **6-digit code** (the pairing port changes every time).
3. In the wizard "Android 11+" tab, enter IP, pairing port, code → **Pair**:
   - `adb pair <ip>:<pairingPort> <code>`  → `POST /api/wireless/pair`
4. Back on the Wireless debugging main screen, note the **IP:connectPort** (a
   different, stable-ish port). Enter it and click **Connect**:
   - `adb connect <ip>:<connectPort>`  → `POST /api/wireless/connect`

> `adb pair` is not exposed by adbkit, so the backend shells out to the resolved
> adb binary for it (and for `tcpip`/`connect`/`disconnect`) — see
> `src/server/adb/AdbBinary.ts`.

## Disconnecting

`POST /api/wireless/disconnect { target? }` → `adb disconnect [target]`.

## Troubleshooting

| Symptom                                   | Cause / fix                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| "adb binary not found"                    | Run `npm run setup:adb`, add adb to `PATH`, or set `SCRCPY_DECK_ADB`.  |
| "device Wi-Fi IP could not be detected"   | Turn Wi-Fi on; ensure the phone is on the same network as the PC.      |
| "Pairing failed"                          | Wrong/expired code, or devices on different networks/subnets.          |
| "Could not connect"                       | Wrong port (use the **main** Wireless debugging port for connect), or a firewall is blocking the LAN. |
| Connection drops after sleep              | Some ROMs reset the adb tcpip port; redo the Classic flow or re-pair.  |
| adb version too old for `pair`            | `pair` needs platform-tools ≥ 30.0.0; `npm run setup:adb` fetches latest. |
