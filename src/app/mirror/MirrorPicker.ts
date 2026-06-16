import { ParamsStreamScrcpy } from '../../types/ParamsStreamScrcpy';
import { MirrorController } from './MirrorController';

export type PlayerOption = {
    playerName: string;
    mirrorParams: ParamsStreamScrcpy;
};

const LABELS: Record<string, { title: string; hint: string }> = {
    'Broadway.js': { title: 'Default', hint: 'Most compatible — works on all devices' },
    'H264 Converter': { title: 'H264', hint: 'High quality hardware-assisted decoding' },
    'Tiny H264': { title: 'Lightweight', hint: 'Low CPU usage, good for older machines' },
    WebCodecs: { title: 'Hardware accelerated', hint: 'Best performance on modern browsers' },
};

export class MirrorPicker {
    private static panel?: HTMLElement;

    public static show(anchor: HTMLElement, options: PlayerOption[], deviceName: string): void {
        MirrorPicker.dismiss();

        if (options.length === 1) {
            MirrorController.open(options[0].mirrorParams, deviceName);
            return;
        }

        const panel = MirrorPicker.buildPanel(options, deviceName);
        document.body.appendChild(panel);
        MirrorPicker.panel = panel;

        const rect = anchor.getBoundingClientRect();
        const panelW = panel.offsetWidth || 280;
        let left = rect.left;
        if (left + panelW > window.innerWidth - 12) left = window.innerWidth - panelW - 12;
        panel.style.top = `${rect.bottom + 8}px`;
        panel.style.left = `${Math.max(12, left)}px`;

        setTimeout(() => {
            const onOutside = (e: MouseEvent) => {
                if (!MirrorPicker.panel?.contains(e.target as Node)) {
                    MirrorPicker.dismiss();
                    document.removeEventListener('mousedown', onOutside);
                }
            };
            document.addEventListener('mousedown', onOutside);
        }, 0);
    }

    public static dismiss(): void {
        MirrorPicker.panel?.remove();
        MirrorPicker.panel = undefined;
    }

    private static buildPanel(options: PlayerOption[], deviceName: string): HTMLElement {
        const panel = document.createElement('div');
        panel.className = 'sd-picker';

        const heading = document.createElement('div');
        heading.className = 'sd-picker-heading';
        heading.textContent = 'Choose streaming method';
        panel.appendChild(heading);

        options.forEach((opt, i) => {
            const meta = LABELS[opt.playerName] ?? { title: opt.playerName, hint: '' };
            const btn = document.createElement('button');
            btn.className = 'sd-picker-item' + (i === 0 ? ' sd-picker-recommended' : '');

            const row = document.createElement('div');
            row.className = 'sd-picker-item-row';

            const title = document.createElement('span');
            title.className = 'sd-picker-item-title';
            title.textContent = meta.title;

            if (i === 0) {
                const badge = document.createElement('span');
                badge.className = 'sd-picker-badge';
                badge.textContent = 'Recommended';
                row.append(title, badge);
            } else {
                row.append(title);
            }

            const hint = document.createElement('span');
            hint.className = 'sd-picker-item-hint';
            hint.textContent = meta.hint;

            btn.append(row, hint);
            btn.addEventListener('click', () => {
                MirrorPicker.dismiss();
                MirrorController.open(opt.mirrorParams, deviceName);
            });
            panel.appendChild(btn);
        });

        return panel;
    }
}
