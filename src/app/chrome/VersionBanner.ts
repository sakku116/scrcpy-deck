export class VersionBanner {
    mount(parent: HTMLElement = document.body): void {
        fetch('/api/version')
            .then((r) => r.json())
            .then(({ current, latest, updateAvailable }: { current: string; latest: string | null; updateAvailable: boolean }) => {
                if (!updateAvailable || !latest) return;
                const bar = document.createElement('div');
                bar.className = 'sd-version-banner';
                bar.innerHTML = `
                    <span>⚠ ScrcpyDeck v${latest} is available (you have v${current})</span>
                    <a class="sd-version-banner__link" href="https://github.com/sakku116/scrcpy-deck/releases/latest" target="_blank" rel="noopener">Releases</a>
                    <button class="sd-version-banner__dismiss" aria-label="Dismiss">✕</button>
                `;
                bar.querySelector('button')!.addEventListener('click', () => bar.remove());
                parent.prepend(bar);
            })
            .catch(() => { /* non-critical, fail silently */ });
    }
}
