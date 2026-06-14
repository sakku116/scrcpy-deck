import { AdbBinary } from '../adb/AdbBinary';
import {
    AdbDeviceInfo,
    ConnectResult,
    DEFAULT_TCPIP_PORT,
    DisconnectRequest,
    TcpipResult,
    WirelessResult,
} from '../../common/WirelessTypes';

const IPV4_RE = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;

/**
 * Business logic for wireless adb connections.
 *
 * Two flows are supported (see `docs/wireless-flows.md`):
 *   - Classic: `adb tcpip` over a USB cable, then `adb connect ip:5555`.
 *   - Android 11+: `adb pair host:port code`, then `adb connect host:port`.
 *
 * All methods return UI-safe {@link WirelessResult} objects and never throw for
 * expected failures (offline device, wrong code, etc.).
 */
export class WirelessService {
    private static instance: WirelessService;

    public static getInstance(): WirelessService {
        if (!WirelessService.instance) {
            WirelessService.instance = new WirelessService();
        }
        return WirelessService.instance;
    }

    /** Enables TCP/IP mode on a USB device, finds its IP and connects over Wi-Fi. */
    public async tcpipConnect(serial: string, port = DEFAULT_TCPIP_PORT): Promise<TcpipResult> {
        if (!serial) {
            return { success: false, connected: false, message: 'Missing device serial.' };
        }
        const tcpip = await AdbBinary.exec(['-s', serial, 'tcpip', String(port)]);
        if (tcpip.failedToSpawn) {
            return { success: false, connected: false, message: this.adbMissingMessage() };
        }
        const tcpipText = `${tcpip.stdout} ${tcpip.stderr}`.toLowerCase();
        if (tcpipText.includes('error') || tcpipText.includes('no devices')) {
            return {
                success: false,
                connected: false,
                message: `Could not switch device to TCP/IP mode: ${tcpip.stdout || tcpip.stderr}`,
            };
        }

        const ip = await this.getDeviceIp(serial);
        if (!ip) {
            return {
                success: false,
                connected: false,
                message: 'TCP/IP mode enabled, but the device Wi-Fi IP could not be detected. Make sure Wi-Fi is on.',
            };
        }

        const connect = await this.connect(ip, port);
        return {
            success: connect.success,
            connected: connect.success,
            ip,
            target: connect.target,
            message: connect.success
                ? `Connected to ${connect.target}. You can unplug the USB cable now.`
                : connect.message,
        };
    }

    /** Android 11+ pairing with a 6-digit code. Does not connect by itself. */
    public async pair(host: string, port: number, code: string): Promise<WirelessResult> {
        if (!host || !port || !code) {
            return { success: false, message: 'Host, port and pairing code are all required.' };
        }
        const result = await AdbBinary.exec(['pair', `${host}:${port}`, code]);
        if (result.failedToSpawn) {
            return { success: false, message: this.adbMissingMessage() };
        }
        const text = `${result.stdout} ${result.stderr}`.toLowerCase();
        if (text.includes('successfully paired')) {
            return { success: true, message: `Paired with ${host}. Now connect using the connection port.` };
        }
        return {
            success: false,
            message: `Pairing failed: ${
                result.stdout || result.stderr || 'check the code and that both devices share the same network.'
            }`,
        };
    }

    /** Connects to an already-reachable adb endpoint (`adb connect host:port`). */
    public async connect(host: string, port: number): Promise<ConnectResult> {
        if (!host || !port) {
            return { success: false, message: 'Host and port are required.' };
        }
        const target = `${host}:${port}`;
        const result = await AdbBinary.exec(['connect', target]);
        if (result.failedToSpawn) {
            return { success: false, message: this.adbMissingMessage() };
        }
        const text = `${result.stdout} ${result.stderr}`.toLowerCase();
        // adb prints "connected to" or "already connected to" on success.
        if (text.includes('connected to')) {
            return { success: true, target, message: `Connected to ${target}.` };
        }
        return {
            success: false,
            message: `Could not connect to ${target}: ${result.stdout || result.stderr || 'device unreachable.'}`,
        };
    }

    /** Disconnects a single target, or all wireless devices when none is given. */
    public async disconnect({ target }: DisconnectRequest): Promise<WirelessResult> {
        const args = target ? ['disconnect', target] : ['disconnect'];
        const result = await AdbBinary.exec(args);
        if (result.failedToSpawn) {
            return { success: false, message: this.adbMissingMessage() };
        }
        return {
            success: true,
            message: target ? `Disconnected ${target}.` : 'Disconnected all wireless devices.',
        };
    }

    /** Parses `adb devices -l` into structured rows. */
    public async listDevices(): Promise<AdbDeviceInfo[]> {
        const result = await AdbBinary.exec(['devices', '-l']);
        if (result.failedToSpawn) {
            return [];
        }
        return result.stdout
            .split('\n')
            .slice(1) // drop the "List of devices attached" header
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
                const [serial, state] = line.split(/\s+/);
                const modelMatch = line.match(/model:(\S+)/);
                return {
                    serial,
                    state: state || 'unknown',
                    wireless: serial.includes(':'),
                    model: modelMatch ? modelMatch[1] : undefined,
                };
            });
    }

    /** Best-effort detection of the device's Wi-Fi IPv4 address. */
    private async getDeviceIp(serial: string): Promise<string | undefined> {
        // Preferred: the wlan0 interface address.
        const wlan = await AdbBinary.exec(['-s', serial, 'shell', 'ip', '-f', 'inet', 'addr', 'show', 'wlan0']);
        const inetMatch = wlan.stdout.match(/inet\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (inetMatch) {
            return inetMatch[1];
        }
        // Fallback: the source address of the default route.
        const route = await AdbBinary.exec(['-s', serial, 'shell', 'ip', 'route']);
        const srcMatch = route.stdout.match(/src\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (srcMatch) {
            return srcMatch[1];
        }
        const anyIp = route.stdout.match(IPV4_RE);
        return anyIp ? anyIp[1] : undefined;
    }

    private adbMissingMessage(): string {
        return 'adb binary not found. Bundle it under vendor/, set SCRCPY_DECK_ADB, or add adb to PATH.';
    }
}
