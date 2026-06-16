// Packages ScrcpyDeck into a single Windows executable.
//
// Approach: the webpacked server bundle (dist/index.js) plus its pure-JS
// runtime dependencies are compiled into one executable with @yao-pkg/pkg (a
// maintained fork of vercel/pkg that supports modern Node). Static assets
// (public/) and binaries (vendor/) are shipped on disk next to the .exe — the
// server detects packaged mode and reads them from the executable's directory.
//
// Prerequisite (kept out of dependencies to stay lightweight):
//   npm i -D @yao-pkg/pkg
//
// Output: dist-exe/ScrcpyDeck.exe + dist-exe/public + dist-exe/vendor
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'dist-exe');
const target = process.env.PKG_TARGET || 'node18-win-x64';

if (!existsSync(path.join(dist, 'index.js'))) {
    console.error('dist/index.js not found. Run `npm run dist` first.');
    process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const exeName = target.includes('win') ? 'ScrcpyDeck.exe' : 'ScrcpyDeck';
const exePath = path.join(outDir, exeName);

console.log(`Packaging ${exeName} for ${target} ...`);
try {
    execFileSync(
        'npx',
        ['--yes', 'pkg@5', path.join(dist, 'index.js'), '--target', target, '--output', exePath],
        { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' },
    );
} catch (err) {
    console.error('\npkg failed. Run `npm i -D pkg` and retry.');
    console.error(err.message);
    process.exit(1);
}

// Ship assets and binaries next to the executable.
console.log('Copying public/ and vendor/ next to the executable ...');
cpSync(path.join(dist, 'public'), path.join(outDir, 'public'), { recursive: true });
if (existsSync(path.join(root, 'vendor'))) {
    cpSync(path.join(root, 'vendor'), path.join(outDir, 'vendor'), { recursive: true });
}

// CLI launcher — lets users add the folder to PATH and run `scrcpy-deck`.
import { writeFileSync } from 'node:fs';
writeFileSync(path.join(outDir, 'scrcpy-deck.bat'), `@echo off\n"%~dp0${exeName}" %*\n`);

console.log(`\nDone. Distribute the whole "${path.basename(outDir)}" folder.`);
