/**
 * Shared request/response contracts for the wireless connection API.
 *
 * These types are the single source of truth used by both the backend
 * (`src/server/api/WirelessRouter.ts`) and the frontend wizard
 * (`src/app/wizard`). Keep them framework-agnostic and serializable.
 */

/** Base shape returned by every wireless endpoint. */
export interface WirelessResult {
    success: boolean;
    /** Human-readable message safe to show in the UI (never a raw stack trace). */
    message: string;
}

/** `POST /api/wireless/tcpip` — enable TCP/IP mode on a USB device and connect. */
export interface TcpipRequest {
    /** adb serial of the USB-connected device. */
    serial: string;
    /** TCP port to expose adb on. Defaults to 5555. */
    port?: number;
}

export interface TcpipResult extends WirelessResult {
    /** Detected device IP on the Wi-Fi interface, when available. */
    ip?: string;
    /** Resulting "ip:port" target if the connect step succeeded. */
    target?: string;
    /** True once the device is reachable over Wi-Fi (USB can be unplugged). */
    connected: boolean;
}

/** `POST /api/wireless/pair` — Android 11+ pairing with a 6-digit code. */
export interface PairRequest {
    /** Host shown under "Pair device with pairing code" (IP). */
    host: string;
    /** Pairing port shown on that same screen (changes every time). */
    port: number;
    /** The 6-digit pairing code. */
    code: string;
}

/** `POST /api/wireless/connect` — connect to an already-reachable adb endpoint. */
export interface ConnectRequest {
    /** Device IP (LAN). */
    host: string;
    /** adb connect port (5555 for classic, or the port from Wireless debugging). */
    port: number;
}

export interface ConnectResult extends WirelessResult {
    /** Resulting "ip:port" target if the connect succeeded. */
    target?: string;
}

/** `POST /api/wireless/disconnect`. */
export interface DisconnectRequest {
    /** "ip:port" target to disconnect, or empty to disconnect all. */
    target?: string;
}

/** A single device row as reported by `adb devices -l`. */
export interface AdbDeviceInfo {
    serial: string;
    /** adb state: device | offline | unauthorized | etc. */
    state: string;
    /** True when the serial looks like "ip:port" (a network device). */
    wireless: boolean;
    model?: string;
}

export interface DevicesResult extends WirelessResult {
    devices: AdbDeviceInfo[];
}

/** `GET /api/wireless/adb-info` — diagnostics about the adb binary in use. */
export interface AdbInfoResult extends WirelessResult {
    /** Absolute path (or bare command) of the adb binary being used. */
    path: string;
    /** First line of `adb --version`, when resolvable. */
    version?: string;
    /** True when the binary is the bundled one under vendor/. */
    bundled: boolean;
}

export const WIRELESS_API_BASE = '/api/wireless';
export const DEFAULT_TCPIP_PORT = 5555;
