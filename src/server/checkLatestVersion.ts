import * as https from 'https';

export function isNewerVersion(latest: string, current: string): boolean {
    const parse = (v: string) => v.split('.').map(Number);
    const [lMaj, lMin, lPat] = parse(latest);
    const [cMaj, cMin, cPat] = parse(current);
    if (lMaj !== cMaj) return lMaj > cMaj;
    if (lMin !== cMin) return lMin > cMin;
    return lPat > cPat;
}

export function checkLatestVersion(): Promise<string | null> {
    return new Promise((resolve) => {
        const req = https.get(
            'https://api.github.com/repos/sakku116/scrcpy-deck/releases/latest',
            { headers: { 'User-Agent': 'scrcpy-deck' } },
            (res) => {
                let body = '';
                res.on('data', (chunk: string) => (body += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body).tag_name?.replace(/^v/, '') ?? null);
                    } catch {
                        resolve(null);
                    }
                });
            },
        );
        req.on('error', () => resolve(null));
    });
}
