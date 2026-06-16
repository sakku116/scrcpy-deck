import '../../../style/devicelist.css';
import { BaseDeviceTracker } from '../../client/BaseDeviceTracker';
import { SERVER_PORT } from '../../../common/Constants';
import { ACTION } from '../../../common/Action';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import { StreamClientScrcpy } from './StreamClientScrcpy';
import SvgImage from '../../ui/SvgImage';
import { html } from '../../ui/HtmlTag';
import Util from '../../Util';
import { Attribute } from '../../Attribute';
import { DeviceState } from '../../../common/DeviceState';
import { Message } from '../../../types/Message';
import { ParamsDeviceTracker } from '../../../types/ParamsDeviceTracker';
import { HostItem } from '../../../types/Configuration';
import { ChannelCode } from '../../../common/ChannelCode';
import { Tool } from '../../client/Tool';
import { MirrorController } from '../../mirror/MirrorController';
import { MirrorPicker, PlayerOption } from '../../mirror/MirrorPicker';
import { WIRELESS_API_BASE } from '../../../common/WirelessTypes';

// Inline SVG icon strings (parsed at runtime — no bundled assets).
const SVG_ONLINE =
    `<svg viewBox="0 0 8 8" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="4" cy="4" r="3.5"/></svg>`;
const SVG_OFFLINE =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M19 5 12 12"/><path d="M5 19 12 12"/>` +
    `<path d="M6 4v4"/><path d="M9 4v4"/>` +
    `<path d="M15 20v-4"/><path d="M18 20v-4"/></svg>`;
const SVG_PLAY =
    `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<polygon points="7,4 20,12 7,20"/></svg>`;
const SVG_FOLDER =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
const SVG_GEAR =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="12" cy="12" r="3"/>` +
    `<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 ` +
    `1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

function parseSvg(markup: string): SVGSVGElement {
    const tmp = document.createElement('div');
    tmp.innerHTML = markup;
    return tmp.firstElementChild as SVGSVGElement;
}

export class DeviceTracker extends BaseDeviceTracker<GoogDeviceDescriptor, never> {
    public static readonly ACTION = ACTION.GOOG_DEVICE_LIST;
    public static readonly CREATE_DIRECT_LINKS = true;
    private static instancesByUrl: Map<string, DeviceTracker> = new Map();
    protected static tools: Set<Tool> = new Set();
    protected tableId = 'goog_device_list';

    public static start(hostItem: HostItem): DeviceTracker {
        const url = this.buildUrlForTracker(hostItem).toString();
        let instance = this.instancesByUrl.get(url);
        if (!instance) {
            instance = new DeviceTracker(hostItem, url);
        }
        return instance;
    }

    public static getInstance(hostItem: HostItem): DeviceTracker {
        return this.start(hostItem);
    }

    protected constructor(params: HostItem, directUrl: string) {
        super({ ...params, action: DeviceTracker.ACTION }, directUrl);
        DeviceTracker.instancesByUrl.set(directUrl, this);
        this.buildDeviceTable();
        this.openNewConnection();
    }

    protected onSocketOpen(): void {
        // nothing here;
    }

    protected setIdAndHostName(id: string, hostName: string): void {
        super.setIdAndHostName(id, hostName);
        for (const value of DeviceTracker.instancesByUrl.values()) {
            if (value.id === id && value !== this) {
                console.warn(
                    `Tracker with url: "${this.url}" has the same id(${this.id}) as tracker with url "${value.url}"`,
                );
                console.warn(`This tracker will shut down`);
                this.destroy();
            }
        }
    }

    onInterfaceSelected = (event: Event): void => {
        const selectElement = event.currentTarget as HTMLSelectElement;
        const option = selectElement.selectedOptions[0];
        const url = decodeURI(option.getAttribute(Attribute.URL) || '');
        const name = option.getAttribute(Attribute.NAME) || '';
        const fullName = decodeURIComponent(selectElement.getAttribute(Attribute.FULL_NAME) || '');
        const udid = selectElement.getAttribute(Attribute.UDID) || '';
        this.updateLink({ url, name, fullName, udid, store: true });
    };

    private updateLink(params: { url: string; name: string; fullName: string; udid: string; store: boolean }): void {
        const { url, name, fullName, udid, store } = params;
        const playerTds = document.getElementsByName(
            encodeURIComponent(`${DeviceTracker.AttributePrefixPlayerFor}${fullName}`),
        );
        if (typeof udid !== 'string') {
            return;
        }
        if (store) {
            const localStorageKey = DeviceTracker.getLocalStorageKey(fullName || '');
            if (localStorage && name) {
                localStorage.setItem(localStorageKey, name);
            }
        }

        const descriptor = this.getDescriptorByUdid(udid);
        const deviceName = descriptor
            ? `${descriptor['ro.product.manufacturer']} ${descriptor['ro.product.model']}`.trim()
            : udid;

        // ScrcpyDeck: first pass — collect all player options so the picker can list them.
        const action = ACTION.STREAM_SCRCPY;
        const options: PlayerOption[] = [];
        playerTds.forEach((item) => {
            const playerFullName = item.getAttribute(DeviceTracker.AttributePlayerFullName);
            const playerCodeName = item.getAttribute(DeviceTracker.AttributePlayerCodeName);
            if (!playerFullName || !playerCodeName) return;
            options.push({
                playerName: decodeURIComponent(playerFullName),
                mirrorParams: {
                    action,
                    udid,
                    player: decodeURIComponent(playerCodeName),
                    ws: url,
                    secure: this.params.secure,
                    hostname: this.params.hostname,
                    port: this.params.port,
                    pathname: this.params.pathname,
                    useProxy: this.params.useProxy,
                },
            });
        });

        // Second pass — build links and wire clicks.
        playerTds.forEach((item) => {
            item.innerHTML = '';
            const playerFullName = item.getAttribute(DeviceTracker.AttributePlayerFullName);
            const playerCodeName = item.getAttribute(DeviceTracker.AttributePlayerCodeName);
            if (!playerFullName || !playerCodeName) return;

            const player = decodeURIComponent(playerCodeName);
            const link = DeviceTracker.buildLink(
                { action, udid, player, ws: url },
                decodeURIComponent(playerFullName),
                this.params,
            );
            link.removeAttribute('target');

            if (item.classList.contains('sd-player-primary')) {
                // ScrcpyDeck: primary button → show picker so user can choose streaming method.
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    MirrorPicker.show(link, options, deviceName);
                });
                // Play icon — injected fresh each time updateLink fires (item is cleared first).
                if (!link.querySelector('svg')) {
                    link.insertBefore(parseSvg(SVG_PLAY), link.firstChild);
                }
            } else {
                // Secondary player links are hidden via CSS; wire direct launch for robustness.
                const opt = options.find((o) => o.mirrorParams.player === player);
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    if (opt) MirrorController.open(opt.mirrorParams, deviceName);
                });
            }
            item.appendChild(link);
        });
    }

    onActionButtonClick = (event: MouseEvent): void => {
        const button = event.currentTarget as HTMLButtonElement;
        const udid = button.getAttribute(Attribute.UDID);
        const pidString = button.getAttribute(Attribute.PID) || '';
        const command = button.getAttribute(Attribute.COMMAND) as string;
        const pid = parseInt(pidString, 10);
        const data: Message = {
            id: this.getNextId(),
            type: command,
            data: {
                udid: typeof udid === 'string' ? udid : undefined,
                pid: isNaN(pid) ? undefined : pid,
            },
        };

        if (this.ws && this.ws.readyState === this.ws.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    };

    private static getLocalStorageKey(udid: string): string {
        return `device_list::${udid}::interface`;
    }

    protected static createUrl(params: ParamsDeviceTracker, udid = ''): URL {
        const secure = !!params.secure;
        const hostname = params.hostname || location.hostname;
        const port = typeof params.port === 'number' ? params.port : secure ? 443 : 80;
        const pathname = params.pathname || location.pathname;
        const urlObject = this.buildUrl({ ...params, secure, hostname, port, pathname });
        if (udid) {
            urlObject.searchParams.set('action', ACTION.PROXY_ADB);
            urlObject.searchParams.set('remote', `tcp:${SERVER_PORT.toString(10)}`);
            urlObject.searchParams.set('udid', udid);
        }
        return urlObject;
    }

    protected static createInterfaceOption(name: string, url: string): HTMLOptionElement {
        const optionElement = document.createElement('option');
        optionElement.setAttribute(Attribute.URL, url);
        optionElement.setAttribute(Attribute.NAME, name);
        optionElement.innerText = `proxy over adb`;
        return optionElement;
    }

    // ── Physical-device grouping ──
    // A USB cable and its wireless link are reported by adb as two separate
    // descriptors for the same phone, linked when the wireless udid ("ip:port")
    // IP also appears among the other descriptor's interface IPs.
    private connectionIps(device: GoogDeviceDescriptor): string[] {
        const ips = (device.interfaces || []).map((i) => i.ipv4).filter(Boolean);
        if (device.udid.includes(':')) {
            ips.push(device.udid.split(':')[0]);
        }
        return ips;
    }

    private isSamePhysicalDevice(a: GoogDeviceDescriptor, b: GoogDeviceDescriptor): boolean {
        if (a === b) {
            return true;
        }
        const ipsB = this.connectionIps(b);
        return this.connectionIps(a).some((ip) => ipsB.includes(ip));
    }

    // Render one card per phone, following the live transport: prefer an online
    // USB link, then an online wireless link. So plugging the cable back in flips
    // the card to USB, and unplugging leaves the wireless link in charge.
    private isPrimaryDescriptor(device: GoogDeviceDescriptor): boolean {
        const group = this.descriptors.filter((d) => this.isSamePhysicalDevice(device, d));
        if (group.length <= 1) {
            return true;
        }
        const rank = (d: GoogDeviceDescriptor): number => {
            const offline = d.state === DeviceState.DEVICE ? 0 : 2;
            const wireless = d.udid.includes(':') ? 1 : 0;
            return offline + wireless;
        };
        return group.reduce((best, d) => (rank(d) < rank(best) ? d : best), group[0]) === device;
    }

    private wirelessEndpoint(device: GoogDeviceDescriptor): { ip: string; port: number } | undefined {
        const twin = device.udid.includes(':')
            ? device
            : this.descriptors.find((d) => d.udid.includes(':') && this.isSamePhysicalDevice(device, d));
        if (!twin) {
            return undefined;
        }
        const [ip, port] = twin.udid.split(':');
        return { ip, port: parseInt(port, 10) };
    }

    private removeDevice = async (device: GoogDeviceDescriptor): Promise<void> => {
        const endpoint = this.wirelessEndpoint(device);
        if (endpoint) {
            await this.callWireless('/disconnect', 'POST', { target: `${endpoint.ip}:${endpoint.port}` });
            await this.callWireless('/history', 'DELETE', { ip: endpoint.ip, port: endpoint.port });
        }
        this.descriptors = this.descriptors.filter((d) => !this.isSamePhysicalDevice(device, d));
        this.buildDeviceTable();
    };

    private async callWireless(path: string, method: string, body: unknown): Promise<void> {
        try {
            await fetch(`${WIRELESS_API_BASE}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch {
            // best-effort: the next list refresh reflects the real state
        }
    }

    // ── Card building ──
    protected buildDeviceRow(tbody: Element, device: GoogDeviceDescriptor): void {
        if (!this.isPrimaryDescriptor(device)) {
            return;
        }
        const blockClass = 'desc-block';
        const fullName = `${this.id}_${Util.escapeUdid(device.udid)}`;
        const isActive = device.state === DeviceState.DEVICE;
        const servicesId = `device_services_${fullName}`;

        const { row, services } = this.buildCardShell(device, isActive, servicesId);
        if (!services) {
            return;
        }

        DeviceTracker.tools.forEach((tool) => {
            const entry = tool.createEntryForDeviceList(device, blockClass, this.params);
            if (!entry) {
                return;
            }
            (Array.isArray(entry) ? entry : [entry]).forEach((item) => item && services.appendChild(item));
        });

        const streamEntry = StreamClientScrcpy.createEntryForDeviceList(device, blockClass, fullName, this.params);
        streamEntry && services.appendChild(streamEntry);

        const interfaces = this.buildInterfacesColumn(device, fullName, isActive, blockClass);
        services.appendChild(interfaces.td);

        const pid = this.buildPidColumn(device, isActive, blockClass);
        services.appendChild(pid.td);

        if (DeviceTracker.CREATE_DIRECT_LINKS) {
            this.appendPlayerPlaceholders(services, fullName, blockClass);
        }

        // Inject SVG icons into action buttons (text content is hidden by CSS).
        const settingsBtn = services.querySelector<HTMLElement>('.action-button');
        settingsBtn?.insertBefore(parseSvg(SVG_GEAR), settingsBtn.firstChild);
        const fileLink = services.querySelector<HTMLElement>('a.link-list-files');
        fileLink?.insertBefore(parseSvg(SVG_FOLDER), fileLink.firstChild);

        tbody.appendChild(row);
        if (DeviceTracker.CREATE_DIRECT_LINKS && pid.hasPid && interfaces.selectedUrl) {
            this.updateLink({
                url: interfaces.selectedUrl,
                name: interfaces.selectedName,
                fullName,
                udid: device.udid,
                store: false,
            });
        }
    }

    private buildCardShell(
        device: GoogDeviceDescriptor,
        isActive: boolean,
        servicesId: string,
    ): { row: DocumentFragment; services: HTMLElement | null } {
        const transport = device.udid.includes(':') ? 'wireless' : 'usb';
        const row = html`<div class="device ${isActive ? 'active' : 'not-active'}">
            <div class="device-top">
                <div class="device-avatar" aria-hidden="true"></div>
                <div class="device-identity">
                    <div class="device-name-row">
                        <div class="device-name">${device['ro.product.manufacturer']} ${device['ro.product.model']}</div>
                        <div class="device-state" title="${isActive ? 'Online' : 'Offline'}"></div>
                    </div>
                    <div class="device-meta">
                        <span class="device-version">${device['ro.build.version.release']}</span>
                        <span class="device-transport device-transport-${transport}">${transport}</span>
                    </div>
                </div>
            </div>
            <div id="${servicesId}" class="services"></div>
        </div>`.content;
        // Inject status SVG into the state element.
        row.querySelector('.device-state')?.appendChild(parseSvg(isActive ? SVG_ONLINE : SVG_OFFLINE));
        // Dots menu button sits at the far right of the name row.
        row.querySelector('.device-name-row')?.appendChild(this.buildDotsButton(device));
        return { row, services: row.getElementById(servicesId) };
    }

    private buildDotsButton(device: GoogDeviceDescriptor): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sd-dots-button';
        button.title = 'More actions';
        button.setAttribute('aria-label', 'More actions');
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = button.closest('.device');
            const existing = card?.querySelector('.sd-device-menu');
            if (existing) {
                existing.remove();
                return;
            }
            document.querySelector('.sd-device-menu')?.remove();
            this.openDeviceMenu(button, device);
        });
        return button;
    }

    private openDeviceMenu(anchor: HTMLElement, device: GoogDeviceDescriptor): void {
        const card = anchor.closest('.device') as HTMLElement | null;

        const menu = document.createElement('div');
        menu.className = 'sd-device-menu';

        const endpoint = this.wirelessEndpoint(device);
        if (endpoint) {
            const disconnectItem = document.createElement('button');
            disconnectItem.type = 'button';
            disconnectItem.className = 'sd-device-menu-item';
            disconnectItem.textContent = 'Disconnect';
            disconnectItem.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                void this.callWireless('/disconnect', 'POST', { target: `${endpoint.ip}:${endpoint.port}`, manual: true });
            });
            menu.appendChild(disconnectItem);
        }

        const removeItem = document.createElement('button');
        removeItem.type = 'button';
        removeItem.className = 'sd-device-menu-item sd-device-menu-danger';
        removeItem.textContent = 'Remove device';
        removeItem.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.remove();
            const name = `${device['ro.product.manufacturer']} ${device['ro.product.model']}`.trim() || device.udid;
            if (window.confirm(`Remove "${name}" from the device list?\n\nThis will disconnect the device and clear it from history.`)) {
                void this.removeDevice(device);
            }
        });

        menu.appendChild(removeItem);

        if (card) {
            card.appendChild(menu);
            const anchorRect = anchor.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            menu.style.top = `${anchorRect.bottom - cardRect.top + 4}px`;
            menu.style.right = `${cardRect.right - anchorRect.right}px`;
        }

        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    }

    private buildPidColumn(
        device: GoogDeviceDescriptor,
        isActive: boolean,
        blockClass: string,
    ): { td: HTMLElement; hasPid: boolean } {
        const value = '' + device.pid;
        const hasPid = value !== '-1';
        const td = document.createElement('div');
        td.classList.add('server_pid', blockClass);

        const button = document.createElement('button');
        button.className = 'action-button kill-server-button';
        button.setAttribute(Attribute.UDID, device.udid);
        button.setAttribute(Attribute.PID, value);
        if (isActive) {
            button.classList.add('active');
            button.onclick = this.onActionButtonClick;
            if (hasPid) {
                button.title = 'Kill server';
                button.appendChild(SvgImage.create(SvgImage.Icon.CANCEL));
                button.setAttribute(Attribute.COMMAND, ControlCenterCommand.KILL_SERVER);
            } else {
                button.title = 'Start server';
                button.appendChild(SvgImage.create(SvgImage.Icon.REFRESH));
                button.setAttribute(Attribute.COMMAND, ControlCenterCommand.START_SERVER);
            }
        } else {
            const timestamp = device['last.update.timestamp'];
            button.title = timestamp
                ? `Last update on ${new Date(timestamp).toLocaleDateString()} at ${new Date(
                      timestamp,
                  ).toLocaleTimeString()}`
                : 'Not active';
            button.appendChild(SvgImage.create(SvgImage.Icon.OFFLINE));
        }
        const span = document.createElement('span');
        span.innerText = value;
        button.appendChild(span);
        td.appendChild(button);
        return { td, hasPid };
    }

    private buildInterfacesColumn(
        device: GoogDeviceDescriptor,
        fullName: string,
        isActive: boolean,
        blockClass: string,
    ): { td: HTMLElement; selectedUrl: string; selectedName: string } {
        let selectedUrl = '';
        let selectedName = '';
        const td = document.createElement('div');
        td.classList.add('net_interface', blockClass);

        const proxyInterfaceUrl = DeviceTracker.createUrl(this.params, device.udid).toString();
        const proxyInterfaceName = 'proxy';
        const localStorageKey = DeviceTracker.getLocalStorageKey(fullName);
        const lastSelected = localStorage && localStorage.getItem(localStorageKey);
        const selectElement = document.createElement('select');
        selectElement.setAttribute(Attribute.UDID, device.udid);
        selectElement.setAttribute(Attribute.FULL_NAME, fullName);
        selectElement.setAttribute(
            'name',
            encodeURIComponent(`${DeviceTracker.AttributePrefixInterfaceSelectFor}${fullName}`),
        );
        /// #if SCRCPY_LISTENS_ON_ALL_INTERFACES
        device.interfaces.forEach((value) => {
            const params = { ...this.params, secure: false, hostname: value.ipv4, port: SERVER_PORT };
            const url = DeviceTracker.createUrl(params).toString();
            const optionElement = DeviceTracker.createInterfaceOption(value.name, url);
            optionElement.innerText = `${value.name}: ${value.ipv4}`;
            selectElement.appendChild(optionElement);
            if (lastSelected) {
                if (lastSelected === value.name || !selectedName) {
                    optionElement.selected = true;
                    selectedUrl = url;
                    selectedName = value.name;
                }
            } else if (device['wifi.interface'] === value.name) {
                optionElement.selected = true;
            }
        });
        /// #else
        selectedUrl = proxyInterfaceUrl;
        selectedName = proxyInterfaceName;
        td.classList.add('hidden');
        /// #endif
        if (isActive) {
            const adbProxyOption = DeviceTracker.createInterfaceOption(proxyInterfaceName, proxyInterfaceUrl);
            if (lastSelected === proxyInterfaceName || !selectedName) {
                adbProxyOption.selected = true;
                selectedUrl = proxyInterfaceUrl;
                selectedName = proxyInterfaceName;
            }
            selectElement.appendChild(adbProxyOption);
            const refreshButton = document.createElement('button');
            refreshButton.className = 'action-button update-interfaces-button active';
            refreshButton.title = 'Update information';
            refreshButton.appendChild(SvgImage.create(SvgImage.Icon.REFRESH));
            refreshButton.setAttribute(Attribute.UDID, device.udid);
            refreshButton.setAttribute(Attribute.COMMAND, ControlCenterCommand.UPDATE_INTERFACES);
            refreshButton.onclick = this.onActionButtonClick;
            td.appendChild(refreshButton);
        }
        selectElement.onchange = this.onInterfaceSelected;
        td.appendChild(selectElement);
        return { td, selectedUrl, selectedName };
    }

    private appendPlayerPlaceholders(services: HTMLElement, fullName: string, blockClass: string): void {
        const name = `${DeviceTracker.AttributePrefixPlayerFor}${fullName}`;
        let playerIndex = 0;
        StreamClientScrcpy.getPlayers().forEach((playerClass) => {
            const { playerCodeName, playerFullName } = playerClass;
            const playerTd = document.createElement('div');
            playerTd.classList.add(blockClass, 'sd-player');
            // ScrcpyDeck: first player becomes the primary "Mirror Screen" CTA.
            if (playerIndex === 0) {
                playerTd.classList.add('sd-player-primary');
            }
            playerIndex++;
            playerTd.setAttribute('name', encodeURIComponent(name));
            playerTd.setAttribute(DeviceTracker.AttributePlayerFullName, encodeURIComponent(playerFullName));
            playerTd.setAttribute(DeviceTracker.AttributePlayerCodeName, encodeURIComponent(playerCodeName));
            services.appendChild(playerTd);
        });
    }

    protected getChannelCode(): string {
        return ChannelCode.GTRC;
    }

    public destroy(): void {
        super.destroy();
        DeviceTracker.instancesByUrl.delete(this.url.toString());
        if (!DeviceTracker.instancesByUrl.size) {
            const holder = document.getElementById(BaseDeviceTracker.HOLDER_ELEMENT_ID);
            if (holder && holder.parentElement) {
                holder.parentElement.removeChild(holder);
            }
        }
    }
}
