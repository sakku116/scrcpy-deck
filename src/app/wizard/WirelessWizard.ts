import '../../style/wizard.css';
import {
    AdbInfoResult,
    ConnectResult,
    PairRequest,
    TcpipResult,
    WIRELESS_API_BASE,
    WirelessResult,
} from '../../common/WirelessTypes';

type TabId = 'classic' | 'android11';

/**
 * Self-contained "Connect Wireless" UI for the ScrcpyDeck dashboard.
 *
 * It renders a modal with two guided flows (Classic and Android 11+), opened via
 * {@link open} from the app header, talking to the backend through
 * {@link WIRELESS_API_BASE}. The
 * component owns its own DOM and styles (`src/style/wizard.css`) and has no
 * dependency on the inherited ws-scrcpy device-table internals, so it stays
 * easy to maintain in isolation.
 */
export class WirelessWizard {
    private overlay?: HTMLElement;
    private statusEl?: HTMLElement;

    /** Shows the wizard modal, building it on first use. */
    public open(): void {
        if (this.overlay) {
            this.overlay.classList.add('sd-visible');
            return;
        }
        this.overlay = this.buildModal();
        document.body.appendChild(this.overlay);
        requestAnimationFrame(() => this.overlay?.classList.add('sd-visible'));
        void this.refreshAdbInfo();
    }

    private close(): void {
        this.overlay?.classList.remove('sd-visible');
    }

    private buildModal(): HTMLElement {
        const overlay = document.createElement('div');
        overlay.className = 'sd-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        const modal = document.createElement('div');
        modal.className = 'sd-modal';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'sd-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());

        const header = document.createElement('div');
        header.className = 'sd-modal-header';
        header.innerHTML =
            '<div class="sd-modal-title">Connect a device wirelessly</div>' +
            '<div class="sd-modal-subtitle">Pick the flow that matches your phone, then follow the steps.</div>';

        const tabs = document.createElement('div');
        tabs.className = 'sd-tabs';
        const classicTab = this.makeTabButton('classic', 'Classic (USB once)');
        const a11Tab = this.makeTabButton('android11', 'Android 11+ (pairing code)');
        tabs.append(classicTab, a11Tab);

        const body = document.createElement('div');
        body.className = 'sd-body';
        body.append(this.buildClassicPane(), this.buildAndroid11Pane());

        this.statusEl = document.createElement('div');
        this.statusEl.className = 'sd-status';

        const adbInfo = document.createElement('div');
        adbInfo.className = 'sd-adb-info';
        adbInfo.id = 'sd-adb-info';

        modal.append(closeBtn, header, tabs, body, this.statusEl, adbInfo);
        overlay.appendChild(modal);
        this.setActiveTab('classic', overlay);
        return overlay;
    }

    private makeTabButton(id: TabId, label: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'sd-tab';
        btn.dataset.tab = id;
        btn.textContent = label;
        btn.addEventListener('click', () => this.setActiveTab(id, this.overlay));
        return btn;
    }

    private setActiveTab(id: TabId, root?: HTMLElement): void {
        if (!root) {
            return;
        }
        root.querySelectorAll('.sd-tab').forEach((el) => {
            el.classList.toggle('sd-active', (el as HTMLElement).dataset.tab === id);
        });
        root.querySelectorAll('.sd-pane').forEach((el) => {
            el.classList.toggle('sd-active', (el as HTMLElement).dataset.pane === id);
        });
    }

    private buildClassicPane(): HTMLElement {
        const pane = document.createElement('div');
        pane.className = 'sd-pane';
        pane.dataset.pane = 'classic';
        pane.innerHTML = `
            <ol class="sd-steps">
                <li>Plug the phone in over USB and accept the "Allow USB debugging" prompt.</li>
                <li>Make sure the phone Wi-Fi is on and shares this computer's network.</li>
                <li>If more than one USB device is connected, enter its serial (from <code>adb devices</code>). Otherwise leave blank.</li>
            </ol>`;

        const serial = this.input('text', 'sd-classic-serial', 'USB serial (optional)');
        const button = document.createElement('button');
        button.className = 'sd-primary';
        button.textContent = 'Enable Wi-Fi & connect';
        button.addEventListener('click', () => this.runClassic(serial.value.trim()));

        pane.append(serial, button);
        return pane;
    }

    private buildAndroid11Pane(): HTMLElement {
        const pane = document.createElement('div');
        pane.className = 'sd-pane';
        pane.dataset.pane = 'android11';
        pane.innerHTML = `
            <ol class="sd-steps">
                <li>On the phone: Settings → Developer options → <b>Wireless debugging</b> → On.</li>
                <li>Tap <b>Pair device with pairing code</b>. Enter the IP, pairing port and 6-digit code below.</li>
                <li>Then connect using the IP and the <b>main</b> port shown on the Wireless debugging screen.</li>
            </ol>`;

        const pairHost = this.input('text', 'sd-pair-host', 'Pairing IP (e.g. 192.168.1.5)');
        const pairPort = this.input('number', 'sd-pair-port', 'Pairing port');
        const pairCode = this.input('text', 'sd-pair-code', '6-digit code');
        const pairBtn = document.createElement('button');
        pairBtn.className = 'sd-primary';
        pairBtn.textContent = 'Pair';
        pairBtn.addEventListener('click', () =>
            this.runPair({ host: pairHost.value.trim(), port: Number(pairPort.value), code: pairCode.value.trim() }),
        );

        const divider = document.createElement('div');
        divider.className = 'sd-divider';
        divider.textContent = 'then connect';

        const connHost = this.input('text', 'sd-conn-host', 'Connect IP');
        const connPort = this.input('number', 'sd-conn-port', 'Connect port');
        const connBtn = document.createElement('button');
        connBtn.className = 'sd-primary';
        connBtn.textContent = 'Connect';
        connBtn.addEventListener('click', () => this.runConnect(connHost.value.trim(), Number(connPort.value)));

        pane.append(pairHost, pairPort, pairCode, pairBtn, divider, connHost, connPort, connBtn);
        return pane;
    }

    private input(type: string, id: string, placeholder: string): HTMLInputElement {
        const el = document.createElement('input');
        el.className = 'sd-input';
        el.type = type;
        el.id = id;
        el.placeholder = placeholder;
        return el;
    }

    private async runClassic(serial: string): Promise<void> {
        this.setStatus('Enabling TCP/IP mode and connecting…', 'pending');
        const result = await this.post<TcpipResult>('/tcpip', { serial });
        this.setStatus(result.message, result.success ? 'ok' : 'error');
        if (result.success) {
            this.scheduleReload();
        }
    }

    private async runPair(req: PairRequest): Promise<void> {
        this.setStatus('Pairing…', 'pending');
        const result = await this.post<WirelessResult>('/pair', req);
        this.setStatus(result.message, result.success ? 'ok' : 'error');
    }

    private async runConnect(host: string, port: number): Promise<void> {
        this.setStatus('Connecting…', 'pending');
        const result = await this.post<ConnectResult>('/connect', { host, port });
        this.setStatus(result.message, result.success ? 'ok' : 'error');
        if (result.success) {
            this.scheduleReload();
        }
    }

    private async refreshAdbInfo(): Promise<void> {
        try {
            const res = await fetch(`${WIRELESS_API_BASE}/adb-info`);
            const info = (await res.json()) as AdbInfoResult;
            const el = document.getElementById('sd-adb-info');
            if (el) {
                el.textContent = info.success
                    ? `adb: ${info.version || 'unknown'} ${info.bundled ? '(bundled)' : '(system)'}`
                    : info.message;
            }
        } catch {
            /* diagnostics only */
        }
    }

    private setStatus(message: string, kind: 'pending' | 'ok' | 'error'): void {
        if (this.statusEl) {
            this.statusEl.textContent = message;
            this.statusEl.className = `sd-status sd-${kind}`;
        }
    }

    /** Reload so the inherited device tracker picks up the new wireless device. */
    private scheduleReload(): void {
        window.setTimeout(() => window.location.reload(), 1500);
    }

    private async post<T extends WirelessResult>(path: string, body: unknown): Promise<T> {
        try {
            const res = await fetch(`${WIRELESS_API_BASE}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            return (await res.json()) as T;
        } catch (e) {
            return { success: false, message: `Request failed: ${(e as Error).message}` } as T;
        }
    }
}
