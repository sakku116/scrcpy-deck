import VideoSettings from '../VideoSettings';
import { StreamClientScrcpy } from '../googDevice/client/StreamClientScrcpy';
import Size from '../Size';
import { FitMode } from './MirrorController';

type Preset = { label: string; bitrate: number; maxFps: number; bounds: Size | null };

const QUALITY_PRESETS: Preset[] = [
    { label: 'Low', bitrate: 1_000_000, maxFps: 20, bounds: new Size(720, 720) },
    { label: 'Medium', bitrate: 4_000_000, maxFps: 30, bounds: new Size(1080, 1080) },
    { label: 'High', bitrate: 8_000_000, maxFps: 60, bounds: new Size(1920, 1920) },
];

const FPS_OPTIONS = [15, 24, 30, 60];

export class MirrorSettings {
    private panel?: HTMLElement;
    private client: StreamClientScrcpy;
    private onFitModeChange: (mode: FitMode) => void;
    private activeQuality = 2;
    private activeFps = 2;
    private activeDisplay = 0;

    constructor(client: StreamClientScrcpy, onFitModeChange: (mode: FitMode) => void) {
        this.client = client;
        this.onFitModeChange = onFitModeChange;
    }

    // The mirror starts with no explicit settings, so the stream runs at the
    // player's bare default (often high bitrate but low resolution). Adopting it
    // would leave the panel showing "High" while the picture stays soft, so we
    // enforce the selected preset — same effect as clicking the button.
    public applyDefaults(): void {
        this.applyVideoSettings();
    }

    public toggle(anchor: HTMLElement): void {
        if (this.panel) {
            this.close();
        } else {
            this.open(anchor);
        }
    }

    public close(): void {
        this.panel?.remove();
        this.panel = undefined;
    }

    private open(anchor: HTMLElement): void {
        const current = this.client.getVideoSettings();
        if (current) {
            this.activeQuality = this.detectQualityIndex(current);
            this.activeFps = this.detectFpsIndex(current);
        }

        this.panel = this.buildPanel();
        document.body.appendChild(this.panel);

        const rect = anchor.getBoundingClientRect();
        this.panel.style.top = `${rect.bottom + 8}px`;
        const right = window.innerWidth - rect.right;
        this.panel.style.right = `${Math.max(8, right)}px`;
    }

    private detectQualityIndex(vs: VideoSettings): number {
        if (vs.bitrate <= 2_000_000) return 0;
        if (vs.bitrate <= 5_000_000) return 1;
        return 2;
    }

    private detectFpsIndex(vs: VideoSettings): number {
        const idx = FPS_OPTIONS.indexOf(vs.maxFps);
        return idx >= 0 ? idx : 2;
    }

    private applyVideoSettings(): void {
        const current = this.client.getVideoSettings();
        const preset = QUALITY_PRESETS[this.activeQuality];
        const fps = FPS_OPTIONS[this.activeFps];
        const next = new VideoSettings({
            bitrate: preset.bitrate,
            maxFps: fps,
            bounds: preset.bounds,
            iFrameInterval: current?.iFrameInterval ?? 5,
            sendFrameMeta: current?.sendFrameMeta ?? false,
            lockedVideoOrientation: current?.lockedVideoOrientation ?? -1,
            displayId: current?.displayId ?? 0,
            codecOptions: current?.codecOptions,
            encoderName: current?.encoderName,
        });
        this.client.sendNewVideoSetting(next);
    }

    private buildPanel(): HTMLElement {
        const panel = document.createElement('div');
        panel.className = 'sd-msettings';

        const heading = document.createElement('div');
        heading.className = 'sd-msettings-heading';
        heading.textContent = 'Stream quality';
        panel.appendChild(heading);

        panel.appendChild(
            this.buildSection(
                'Quality',
                QUALITY_PRESETS.map((p) => p.label),
                this.activeQuality,
                (i) => {
                    this.activeQuality = i;
                    this.applyVideoSettings();
                },
            ),
        );

        panel.appendChild(
            this.buildSection(
                'Speed',
                FPS_OPTIONS.map((f) => `${f} fps`),
                this.activeFps,
                (i) => {
                    this.activeFps = i;
                    this.applyVideoSettings();
                },
            ),
        );

        panel.appendChild(
            this.buildSection('Display', ['Portrait', 'Landscape'], this.activeDisplay, (i) => {
                this.activeDisplay = i;
                this.onFitModeChange(i === 0 ? 'height' : 'width');
            }),
        );

        return panel;
    }

    private buildSection(
        label: string,
        options: string[],
        active: number,
        onSelect: (i: number) => void,
    ): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'sd-msettings-section';

        const lbl = document.createElement('div');
        lbl.className = 'sd-msettings-label';
        lbl.textContent = label;
        wrap.appendChild(lbl);

        const row = document.createElement('div');
        row.className = 'sd-msettings-row';

        options.forEach((text, i) => {
            const btn = document.createElement('button');
            btn.className = 'sd-msettings-opt' + (i === active ? ' sd-msettings-opt-active' : '');
            btn.textContent = text;
            btn.addEventListener('click', () => {
                row.querySelectorAll('.sd-msettings-opt').forEach((b, j) => {
                    b.classList.toggle('sd-msettings-opt-active', j === i);
                });
                onSelect(i);
            });
            row.appendChild(btn);
        });

        wrap.appendChild(row);
        return wrap;
    }
}
