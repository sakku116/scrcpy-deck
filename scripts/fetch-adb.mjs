// Downloads Google's android platform-tools and extracts `adb` into
// `vendor/<platform>/` so ScrcpyDeck can ship a self-contained binary.
//
// Usage: `npm run setup:adb` (current OS) — re-run per target OS before
// packaging. Binaries are intentionally git-ignored (see .gitignore).
import { createWriteStream } from 'node:fs';
import { mkdir, rm, readdir, rename, copyFile, unlink, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLATFORM_MAP = {
    win32: { url: 'platform-tools-latest-windows.zip', dir: 'win', bin: 'adb.exe', extras: ['AdbWinApi.dll', 'AdbWinUsbApi.dll'] },
    darwin: { url: 'platform-tools-latest-darwin.zip', dir: 'mac', bin: 'adb', extras: [] },
    linux: { url: 'platform-tools-latest-linux.zip', dir: 'linux', bin: 'adb', extras: [] },
};

const BASE = 'https://dl.google.com/android/repository/';

async function main() {
    const target = PLATFORM_MAP[process.platform];
    if (!target) {
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
    const root = path.resolve(__dirname, '..');
    const outDir = path.join(root, 'vendor', target.dir);
    if (existsSync(path.join(outDir, target.bin))) {
        console.log(`adb already present at vendor/${target.dir}/${target.bin}`);
        return;
    }

    const zipPath = path.join(tmpdir(), target.url);
    const url = BASE + target.url;
    console.log(`Downloading ${url} ...`);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }
    await pipeline(res.body, createWriteStream(zipPath));

    const extractDir = path.join(tmpdir(), `platform-tools-${target.dir}`);
    await rm(extractDir, { recursive: true, force: true });
    await mkdir(extractDir, { recursive: true });
    console.log('Extracting ...');
    if (process.platform === 'win32') {
        execFileSync(
            'powershell',
            ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`],
            { stdio: 'inherit' },
        );
    } else {
        execFileSync('unzip', ['-q', zipPath, '-d', extractDir], { stdio: 'inherit' });
    }

    await mkdir(outDir, { recursive: true });
    const srcDir = path.join(extractDir, 'platform-tools');
    for (const name of [target.bin, ...target.extras]) {
        const from = path.join(srcDir, name);
        if (existsSync(from)) {
            const to = path.join(outDir, name);
            await copyFile(from, to);
            await unlink(from);
            if (!name.endsWith('.dll')) {
                await chmod(to, 0o755);
            }
        }
    }
    console.log(`Done. Extracted adb to vendor/${target.dir}/`);
    console.log('Files:', await readdir(outDir));
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
