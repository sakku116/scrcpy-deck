import { StreamClientScrcpy } from '../googDevice/client/StreamClientScrcpy';
import { ParamsStreamScrcpy } from '../../types/ParamsStreamScrcpy';
import { MirrorSettings } from './MirrorSettings';

export type FitMode = 'height' | 'width';

export class MirrorController {
    private static client?: StreamClientScrcpy;
    private static bar?: HTMLElement;
    private static settings?: MirrorSettings;
    private static videoEl?: HTMLElement;
    private static controlsEl?: HTMLElement;
    private static fitMode: FitMode = 'height';
    private static naturalW = 0;
    private static naturalH = 0;
    private static sizeObserver?: MutationObserver;
    private static onWindowResize?: () => void;
    private static defaultsApplied = false;

    public static open(params: ParamsStreamScrcpy, deviceName: string): void {
        if (MirrorController.client) {
            MirrorController.back();
        }
        MirrorController.fitMode = 'height';
        MirrorController.naturalW = 0;
        MirrorController.naturalH = 0;
        MirrorController.defaultsApplied = false;
        MirrorController.client = StreamClientScrcpy.start(params);
        document.body.classList.add('sd-mirroring');
        MirrorController.settings = new MirrorSettings(MirrorController.client, (mode) =>
            MirrorController.setFitMode(mode),
        );
        MirrorController.bar = MirrorController.buildBar(deviceName);
        document.body.appendChild(MirrorController.bar);
        MirrorController.watchForDeviceView();
    }

    public static back(): void {
        MirrorController.sizeObserver?.disconnect();
        MirrorController.sizeObserver = undefined;
        if (MirrorController.onWindowResize) {
            window.removeEventListener('resize', MirrorController.onWindowResize);
            MirrorController.onWindowResize = undefined;
        }
        MirrorController.videoEl = undefined;
        MirrorController.controlsEl = undefined;
        MirrorController.settings?.close();
        MirrorController.settings = undefined;
        MirrorController.client?.stop();
        MirrorController.client = undefined;
        MirrorController.bar?.remove();
        MirrorController.bar = undefined;
        document.body.className = 'list';
    }

    public static setFitMode(mode: FitMode): void {
        MirrorController.fitMode = mode;
        MirrorController.applyScale();
    }

    private static watchForDeviceView(): void {
        const existing = document.querySelector<HTMLElement>('.device-view');
        if (existing) {
            MirrorController.attachDeviceView(existing);
            return;
        }
        const mo = new MutationObserver(() => {
            const dv = document.querySelector<HTMLElement>('.device-view');
            if (dv) {
                mo.disconnect();
                MirrorController.attachDeviceView(dv);
            }
        });
        mo.observe(document.body, { childList: true });
    }

    private static attachDeviceView(dv: HTMLElement): void {
        const video = dv.querySelector<HTMLElement>('.video');
        const canvas = dv.querySelector<HTMLCanvasElement>('.touch-layer');
        MirrorController.videoEl = video ?? undefined;
        MirrorController.controlsEl = dv.querySelector<HTMLElement>('.control-buttons-list') ?? undefined;
        if (!video || !canvas) {
            return;
        }

        // setScreenInfo() writes the device resolution onto the touch canvas's
        // width/height attributes. Reading those (not the styled .video box) keeps
        // the natural size source separate from the box we resize, so there is no
        // observer feedback loop.
        const readNatural = (): void => {
            const w = canvas.width;
            const h = canvas.height;
            if (!w || !h) {
                return;
            }
            MirrorController.naturalW = w;
            MirrorController.naturalH = h;
            MirrorController.applyScale();
            // Stream is live now; push the default quality so the picture matches
            // the preset the settings panel shows (only once per session).
            if (!MirrorController.defaultsApplied) {
                MirrorController.defaultsApplied = true;
                MirrorController.settings?.applyDefaults();
            }
        };

        const obs = new MutationObserver(readNatural);
        obs.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
        MirrorController.sizeObserver = obs;

        const onResize = () => MirrorController.applyScale();
        MirrorController.onWindowResize = onResize;
        window.addEventListener('resize', onResize);

        readNatural();
    }

    private static applyScale(): void {
        const video = MirrorController.videoEl;
        const { naturalW, naturalH } = MirrorController;
        if (!video || !naturalW || !naturalH) {
            return;
        }

        const controlsW = MirrorController.controlsEl?.offsetWidth ?? 0;
        const availH = window.innerHeight - 48;
        const availW = window.innerWidth - controlsW;
        if (availH <= 0 || availW <= 0) {
            return;
        }

        const aspect = naturalW / naturalH;
        let w: number;
        let h: number;
        if (MirrorController.fitMode === 'height') {
            h = availH;
            w = h * aspect;
            if (w > availW) {
                w = availW;
                h = w / aspect;
            }
        } else {
            w = availW;
            h = w / aspect;
            if (h > availH) {
                h = availH;
                w = h * aspect;
            }
        }

        // Size via CSS width/height (never transform/zoom) so the touch canvas's
        // clientWidth equals its on-screen size and ws-scrcpy's coordinate mapping
        // stays exact.
        video.style.width = `${Math.round(w)}px`;
        video.style.height = `${Math.round(h)}px`;
    }

    private static buildBar(deviceName: string): HTMLElement {
        const bar = document.createElement('div');
        bar.className = 'sd-mirror-bar';

        const back = document.createElement('button');
        back.className = 'sd-mirror-back';
        back.innerHTML = '<span>←</span> Back to devices';
        back.addEventListener('click', () => MirrorController.back());

        const title = document.createElement('div');
        title.className = 'sd-mirror-title';
        title.textContent = deviceName;

        const spacer = document.createElement('div');
        spacer.style.flex = '1';

        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'sd-mirror-settings-btn';
        settingsBtn.textContent = '⚙ Quality';
        settingsBtn.addEventListener('click', () => {
            MirrorController.settings?.toggle(settingsBtn);
        });

        bar.append(back, title, spacer, settingsBtn);
        return bar;
    }
}
