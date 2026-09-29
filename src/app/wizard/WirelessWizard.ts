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

export class WirelessWizard {
    private dialog?: HTMLDialogElement;
    private statusEl?: HTMLElement;
    private opener?: HTMLElement;

    public open(): void {
        if (!this.dialog) {
            this.dialog = this.buildModal();
            document.body.appendChild(this.dialog);
            void this.refreshAdbInfo();
        }
        if (!this.dialog.open) {
            this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
            this.dialog.showModal();
            this.dialog.querySelector<HTMLButtonElement>('.sd-tab')?.focus();
        }
    }

    private close(): void {
        if (this.dialog?.open) this.dialog.close();
    }

    private buildModal(): HTMLDialogElement {
        const dialog = document.createElement('dialog');
        dialog.className = 'sd-overlay';
        dialog.setAttribute('aria-labelledby', 'sd-dialog-title');
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) this.close();
        });
        dialog.addEventListener('close', () => {
            if (this.opener?.isConnected) this.opener.focus();
        });

        const modal = document.createElement('div');
        modal.className = 'sd-modal';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'sd-close';
        closeBtn.setAttribute('aria-label', 'Close wireless connection wizard');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());

        const header = document.createElement('div');
        header.className = 'sd-modal-header';
        header.innerHTML =
            '<div class="sd-modal-title" id="sd-dialog-title">Connect a device wirelessly</div>' +
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
        this.statusEl.setAttribute('role', 'status');
        const adbInfo = document.createElement('div');
        adbInfo.className = 'sd-adb-info';
        adbInfo.id = 'sd-adb-info';
        modal.append(closeBtn, header, tabs, body, this.statusEl, adbInfo);
        dialog.appendChild(modal);
        this.setActiveTab('classic', dialog);
        return dialog;
    }

    private makeTabButton(id: TabId, label: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = 'sd-tab';
        btn.dataset.tab = id;
        btn.textContent = label;
        btn.setAttribute('aria-controls', `sd-pane-${id}`);
        btn.addEventListener('click', () => this.setActiveTab(id, this.dialog));
        return btn;
    }

    private setActiveTab(id: TabId, root?: HTMLElement): void {
        root?.querySelectorAll('.sd-tab').forEach((el) => {
            const active = (el as HTMLElement).dataset.tab === id;
            el.classList.toggle('sd-active', active);
            el.setAttribute('aria-pressed', String(active));
        });
        root?.querySelectorAll<HTMLElement>('.sd-pane').forEach((el) => {
            const active = el.dataset.pane === id;
            el.classList.toggle('sd-active', active);
            el.hidden = !active;
        });
    }

    private buildClassicPane(): HTMLElement {
        const pane = document.createElement('div');
        pane.className = 'sd-pane';
        pane.dataset.pane = 'classic';
        pane.id = 'sd-pane-classic';
        const instructions = document.createElement('div');
        instructions.className = 'sd-instructions';
        instructions.innerHTML =
            '<ol class="sd-steps"><li>Plug the phone in over USB and accept the "Allow USB debugging" prompt.</li><li>Make sure the phone Wi-Fi is on and shares this computer\'s network.</li><li>If more than one USB device is connected, enter its serial (from <code>adb devices</code>). Otherwise leave blank.</li></ol>';
        const form = document.createElement('div');
        form.className = 'sd-form';
        const serial = this.input('text', 'sd-classic-serial', 'USB serial (optional)', 'serial');
        const button = document.createElement('button');
        button.className = 'sd-primary';
        button.textContent = 'Enable Wi-Fi & connect';
        button.addEventListener('click', () => this.runClassic(serial.value.trim()));
        form.append(this.field('USB serial (optional)', serial), button);
        pane.append(instructions, form);
        return pane;
    }

    private buildAndroid11Pane(): HTMLElement {
        const pane = document.createElement('div');
        pane.className = 'sd-pane';
        pane.dataset.pane = 'android11';
        pane.id = 'sd-pane-android11';
        const instructions = document.createElement('div');
        instructions.className = 'sd-instructions';
        instructions.innerHTML =
            '<ol class="sd-steps"><li>On the phone: Settings → Developer options → <b>Wireless debugging</b> → On.</li><li>Tap <b>Pair device with pairing code</b>. Enter the IP, pairing port and 6-digit code below.</li><li>Then connect using the IP and the <b>main</b> port shown on the Wireless debugging screen.</li></ol>';
        const form = document.createElement('div');
        form.className = 'sd-form';
        const pairSection = document.createElement('div');
        pairSection.className = 'sd-form-section';
        const connectSection = document.createElement('div');
        connectSection.className = 'sd-form-section';
        const pairHost = this.input('text', 'sd-pair-host', 'Pairing IP', 'pair-host');
        const pairPort = this.input('number', 'sd-pair-port', 'Pairing port', 'pair-port');
        const pairCode = this.input('text', 'sd-pair-code', '6-digit code', 'pair-code');
        pairCode.inputMode = 'numeric';
        pairCode.spellcheck = false;
        const pairBtn = document.createElement('button');
        pairBtn.className = 'sd-primary';
        pairBtn.textContent = 'Pair';
        pairBtn.addEventListener('click', () =>
            this.runPair({ host: pairHost.value.trim(), port: Number(pairPort.value), code: pairCode.value.trim() }),
        );
        const divider = document.createElement('div');
        divider.className = 'sd-divider';
        divider.textContent = 'then connect';
        const connHost = this.input('text', 'sd-conn-host', 'Connect IP', 'connect-host');
        const connPort = this.input('number', 'sd-conn-port', 'Connect port', 'connect-port');
        const connBtn = document.createElement('button');
        connBtn.className = 'sd-primary';
        connBtn.textContent = 'Connect';
        connBtn.addEventListener('click', () => this.runConnect(connHost.value.trim(), Number(connPort.value)));
        pairSection.append(
            this.field('Pairing IP (e.g. 192.168.1.5)', pairHost),
            this.field('Pairing port', pairPort),
            this.field('6-digit code', pairCode),
            pairBtn,
        );
        connectSection.append(this.field('Connect IP', connHost), this.field('Connect port', connPort), connBtn);
        form.append(pairSection, divider, connectSection);
        pane.append(instructions, form);
        return pane;
    }

    private field(label: string, input: HTMLInputElement): HTMLLabelElement {
        const wrapper = document.createElement('label');
        wrapper.className = 'sd-field';
        wrapper.textContent = label;
        wrapper.htmlFor = input.id;
        wrapper.appendChild(input);
        return wrapper;
    }

    private input(type: string, id: string, placeholder: string, name: string): HTMLInputElement {
        const el = document.createElement('input');
        el.className = 'sd-input';
        el.type = type;
        el.id = id;
        el.name = name;
        el.placeholder = placeholder;
        el.autocomplete = 'off';
        return el;
    }

    private async runClassic(serial: string): Promise<void> {
        this.setStatus('Enabling TCP/IP mode and connecting…', 'pending');
        const result = await this.post<TcpipResult>('/tcpip', { serial });
        this.setStatus(result.message, result.success ? 'ok' : 'error');
        if (result.success) this.scheduleReload();
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
        if (result.success) this.scheduleReload();
    }
    private async refreshAdbInfo(): Promise<void> {
        try {
            const res = await fetch(`${WIRELESS_API_BASE}/adb-info`);
            const info = (await res.json()) as AdbInfoResult;
            const el = document.getElementById('sd-adb-info');
            if (el)
                el.textContent = info.success
                    ? `adb: ${info.version || 'unknown'} ${info.bundled ? '(bundled)' : '(system)'}`
                    : info.message;
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
