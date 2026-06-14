# Architecture

ScrcpyDeck = **ws-scrcpy** (inherited in-browser mirroring engine) + a thin,
self-contained **wireless** layer added on top. The added code is deliberately
isolated so it stays maintainable and easy to reason about.

## Runtime overview

```
Browser (ScrcpyDeck UI)
  │  REST  (HTTP/JSON)        ─────────►  Express app  (HttpServer)
  │  WebSocket (H264 + input) ◄────────►  ws-scrcpy relay  ──►  adb server  ──►  Android
  └─ decoders: WebCodecs / MSE / Broadway / TinyH264         (scrcpy-server.jar pushed to device)
```

## Layers (added by ScrcpyDeck)

| Layer        | Path                                   | Responsibility                                        |
| ------------ | -------------------------------------- | ----------------------------------------------------- |
| Shared types | `src/common/WirelessTypes.ts`          | Single source of truth for REST payloads (FE + BE).   |
| HTTP (thin)  | `src/server/api/WirelessRouter.ts`     | Parse request, delegate, return JSON. No adb logic.   |
| Business     | `src/server/wireless/WirelessService.ts` | Classic & Android 11+ flows; UI-safe results.       |
| I/O          | `src/server/adb/AdbBinary.ts`          | Resolve + execute the adb binary (incl. `pair`).      |
| UI           | `src/app/wizard/WirelessWizard.ts`     | Self-contained modal wizard; talks to the REST API.   |

**Dependency rule:** `api → wireless → adb`. The UI never calls adb directly; it
only speaks REST. The wizard owns its own DOM and styles (`src/style/wizard.css`)
and does not touch the inherited device-table internals.

## Integration points with the inherited code

- `src/server/services/HttpServer.ts` mounts the wireless router at
  `WIRELESS_API_BASE` and starts the adb server on boot. It also resolves static
  assets from the executable's directory when packaged.
- `src/app/index.ts` mounts the `WirelessWizard` on the dashboard after
  `HostTracker.start()`. The inherited tracker then lists any device that becomes
  reachable (USB or wireless).

## Why a backend is required

Browsers are sandboxed: a pure HTML page cannot spawn `adb`/`scrcpy` or access
the USB serial transport. ScrcpyDeck therefore runs a local Node backend; the
frontend stays "just a web page" served by it.

## Build-time configuration

Disabled-by-default features are stripped at build time via `ifdef-loader`
(`webpack/default.build.config.json`): `INCLUDE_ADB_SHELL`, `INCLUDE_APPL`,
`USE_QVH_SERVER` are off, which is why their native-only dependencies
(`node-pty`, `ios-device-lib`) are not installed. `onlyCompileBundledFiles` keeps
the type-checker focused on bundled files.
