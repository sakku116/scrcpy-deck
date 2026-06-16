import { WirelessService } from './WirelessService';
import { DeviceStore } from '../DeviceStore';
import { EnvName } from '../EnvName';
import { DEFAULT_TCPIP_PORT } from '../../common/WirelessTypes';

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 3;
// How long to wait after a failed reconnect before trying the same endpoint again.
const RECONNECT_COOLDOWN_MS = 30_000;

/**
 * Background watcher that keeps USB devices reachable after the cable is pulled,
 * and auto-reconnects saved wireless devices when they reappear on the network.
 *
 * Two jobs run on every tick:
 *   1. USB → wireless: for every authorized USB device, switch it to TCP/IP mode
 *      and save the endpoint in {@link DeviceStore}.
 *   2. Wireless reconnect: for every saved endpoint in {@link DeviceStore} that is
 *      not currently online in `adb devices`, run `adb connect` again. This handles
 *      the case where the phone disconnected from Wi-Fi and then reconnected, which
 *      breaks the TCP socket without any notification.
 */
export class DeviceWatcher {
    private static instance: DeviceWatcher;
    private timer?: ReturnType<typeof setInterval>;
    private readonly service = WirelessService.getInstance();
    private readonly store = DeviceStore.getInstance();
    // USB serials seen during their current plug session, mapped to how many
    // switch attempts we have made; cleared on unplug so a re-plug starts fresh.
    private attempts = new Map<string, number>();
    // Keys with an async operation in progress (USB serial or "ip:port").
    private inFlight = new Set<string>();
    // "ip:port" → earliest timestamp when a reconnect may be attempted again.
    private reconnectCooldown = new Map<string, number>();
    // Endpoints the user intentionally disconnected — skip auto-reconnect until
    // the user explicitly reconnects (clears the entry via resumeReconnect).
    private manuallyDisconnected = new Set<string>();

    public static getInstance(): DeviceWatcher {
        if (!DeviceWatcher.instance) {
            DeviceWatcher.instance = new DeviceWatcher();
        }
        return DeviceWatcher.instance;
    }

    public static isEnabled(): boolean {
        return process.env[EnvName.AUTO_WIRELESS] !== '0';
    }

    public start(): void {
        if (this.timer || !DeviceWatcher.isEnabled()) {
            return;
        }
        const timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
        this.timer = timer;
        // Do not keep the process alive solely for the poll (Node only).
        (timer as unknown as { unref?: () => void }).unref?.();
    }

    /** Called when the user intentionally disconnects a device from the UI. */
    public pauseReconnect(target: string): void {
        this.manuallyDisconnected.add(target);
        this.reconnectCooldown.delete(target);
    }

    /** Called when the user explicitly reconnects (wizard / POST /connect). */
    public resumeReconnect(target: string): void {
        this.manuallyDisconnected.delete(target);
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    private async tick(): Promise<void> {
        const devices = await this.service.listDevices();

        // ── Job 1: USB → wireless ──────────────────────────────────────────────
        const usbSerials = new Set(devices.filter((d) => !d.wireless).map((d) => d.serial));

        // Forget devices that are no longer plugged in so a re-plug starts fresh.
        for (const serial of this.attempts.keys()) {
            if (!usbSerials.has(serial)) {
                this.attempts.delete(serial);
            }
        }

        for (const device of devices) {
            if (device.wireless || device.state !== 'device') {
                continue;
            }
            const tried = this.attempts.get(device.serial) ?? 0;
            if (tried >= MAX_ATTEMPTS || this.inFlight.has(device.serial)) {
                continue;
            }
            this.attempts.set(device.serial, tried + 1);
            void this.switchToWireless(device.serial);
        }

        // ── Job 2: reconnect saved wireless endpoints that went offline ────────
        const onlineWireless = new Set(
            devices.filter((d) => d.wireless && d.state === 'device').map((d) => d.serial),
        );
        const now = Date.now();

        for (const entry of this.store.getHistory()) {
            const target = `${entry.ip}:${entry.port}`;
            if (onlineWireless.has(target)) {
                // Device is healthy — clear any cooldown so next drop reconnects fast.
                this.reconnectCooldown.delete(target);
                continue;
            }
            if (this.inFlight.has(target)) continue;
            if (this.manuallyDisconnected.has(target)) continue;
            const cooldownUntil = this.reconnectCooldown.get(target) ?? 0;
            if (now < cooldownUntil) continue;
            void this.reconnectWireless(entry.ip, entry.port);
        }
    }

    private async switchToWireless(serial: string): Promise<void> {
        this.inFlight.add(serial);
        try {
            const result = await this.service.tcpipConnect(serial, DEFAULT_TCPIP_PORT);
            if (result.success && result.ip) {
                const port = result.target ? parseInt(result.target.split(':')[1], 10) : DEFAULT_TCPIP_PORT;
                this.store.upsert(result.ip, port);
                // Stop retrying once it is reachable over Wi-Fi.
                this.attempts.set(serial, MAX_ATTEMPTS);
                console.log(`[auto-wireless] ${serial} is now reachable at ${result.target}`);
            }
        } catch {
            // Leave the attempt count as-is; the next poll retries until the cap.
        } finally {
            this.inFlight.delete(serial);
        }
    }

    private async reconnectWireless(ip: string, port: number): Promise<void> {
        const target = `${ip}:${port}`;
        this.inFlight.add(target);
        try {
            const result = await this.service.connect(ip, port);
            if (result.success) {
                this.store.upsert(ip, port);
                this.reconnectCooldown.delete(target);
                console.log(`[auto-wireless] reconnected to ${target}`);
            } else {
                this.reconnectCooldown.set(target, Date.now() + RECONNECT_COOLDOWN_MS);
            }
        } catch {
            this.reconnectCooldown.set(target, Date.now() + RECONNECT_COOLDOWN_MS);
        } finally {
            this.inFlight.delete(target);
        }
    }
}
