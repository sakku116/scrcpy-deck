import '../../style/chrome.css';
import { WirelessWizard } from '../wizard/WirelessWizard';

/**
 * ScrcpyDeck top bar: brand only.
 *
 * The "Add device" entry point lives in the device list as a persistent "+"
 * card (last item, always visible). When the list is empty it expands into a
 * full empty-state with title and hint text.
 */
export class AppHeader {
    private readonly wizard = new WirelessWizard();

    public mount(parent: HTMLElement = document.body): void {
        parent.appendChild(this.buildHeader());

        const sync = () => this.syncAddCard();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true });
        sync();
    }

    private buildHeader(): HTMLElement {
        const header = document.createElement('header');
        header.id = 'sd-header';
        header.className = 'sd-header';

        const inner = document.createElement('div');
        inner.className = 'sd-header-inner';

        const brand = document.createElement('div');
        brand.className = 'sd-brand';
        brand.innerHTML = 'Scrcpy<b>Deck</b>';

        inner.appendChild(brand);
        header.appendChild(inner);
        return header;
    }

    private syncAddCard(): void {
        const list = document.querySelector<HTMLElement>('#devices .device-list');
        if (!list) return;

        let card = document.getElementById('sd-add-card') as HTMLElement | null;
        // Guard: already the last child — just sync the empty-state class.
        if (card && card.parentElement === list && !card.nextElementSibling) {
            this.syncEmptyClass(list);
            return;
        }
        if (!card) {
            card = this.buildAddCard();
        }
        list.appendChild(card);
        this.syncEmptyClass(list);
    }

    private syncEmptyClass(list: HTMLElement): void {
        const hasDevices = list.querySelectorAll('.device').length > 0;
        list.classList.toggle('sd-list-empty', !hasDevices);
    }

    private buildAddCard(): HTMLElement {
        const btn = document.createElement('button');
        btn.id = 'sd-add-card';
        btn.className = 'sd-add-card';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Add device');
        btn.addEventListener('click', () => this.wizard.open());

        // Empty-state copy (hidden when real devices are present).
        const hint = document.createElement('div');
        hint.className = 'sd-add-hint';
        const hintTitle = document.createElement('div');
        hintTitle.className = 'sd-add-hint-title';
        hintTitle.textContent = 'No devices yet';
        const hintText = document.createElement('p');
        hintText.textContent = 'Plug a phone in over USB, or connect wirelessly to start mirroring.';
        hint.append(hintTitle, hintText);

        // Always-visible action row: SVG "+" icon + label.
        const row = document.createElement('div');
        row.className = 'sd-add-row';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 5v14M5 12h14');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);

        const label = document.createElement('span');
        label.textContent = 'Add device';

        row.append(svg, label);
        btn.append(hint, row);
        return btn;
    }
}
