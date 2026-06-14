// Starts the built ScrcpyDeck server and opens the default browser at it.
// This powers `npm run app` and is the basis for the packaged executable:
// the end-user experience is "run, then the browser opens automatically".
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'dist', 'index.js');
const url = process.env.SCRCPY_DECK_URL || 'http://localhost:8000';

// Run the server from the dist directory so its static assets resolve.
const server = spawn(process.execPath, [entry], {
    cwd: path.join(root, 'dist'),
    stdio: 'inherit',
});

function openBrowser(target) {
    const platform = process.platform;
    if (platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', target], { stdio: 'ignore', detached: true }).unref();
    } else if (platform === 'darwin') {
        spawn('open', [target], { stdio: 'ignore', detached: true }).unref();
    } else {
        spawn('xdg-open', [target], { stdio: 'ignore', detached: true }).unref();
    }
}

// Give the HTTP server a moment to bind before opening the browser.
setTimeout(() => openBrowser(url), 1500);

const shutdown = () => {
    server.kill();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', (code) => process.exit(code ?? 0));
