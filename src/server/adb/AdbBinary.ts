import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';

/**
 * Resolves and executes the `adb` binary.
 *
 * Resolution order:
 *   1. `SCRCPY_DECK_ADB` env var (explicit absolute path).
 *   2. A bundled binary under `vendor/<platform>/adb[.exe]`, searched relative
 *      to both the current working directory and this module's directory so it
 *      works in dev (`dist/`), in the packaged `.exe`, and in Docker.
 *   3. The bare command `adb` from `PATH` (used by the Docker image, which
 *      installs android platform-tools).
 *
 * Operations such as `pair` are not exposed by adbkit, so the whole wireless
 * flow shells out to this single resolved binary for consistency.
 */
export class AdbBinary {
    private static cachedPath: string | null = null;
    private static cachedBundled = false;

    private static platformDir(): string {
        switch (process.platform) {
            case 'win32':
                return 'win';
            case 'darwin':
                return 'mac';
            default:
                return 'linux';
        }
    }

    private static binaryName(): string {
        return process.platform === 'win32' ? 'adb.exe' : 'adb';
    }

    private static candidateRoots(): string[] {
        // Directories that may contain a `vendor/` folder, in priority order.
        // `process.execPath` covers the packaged executable, whose `vendor/` is
        // shipped next to it.
        return [
            path.dirname(process.execPath),
            process.cwd(),
            path.resolve(process.cwd(), '..'),
            __dirname,
            path.resolve(__dirname, '..'),
            path.resolve(__dirname, '..', '..'),
        ];
    }

    /** Returns the adb command/path to invoke, caching the result. */
    public static resolve(): string {
        if (AdbBinary.cachedPath) {
            return AdbBinary.cachedPath;
        }

        const fromEnv = process.env.SCRCPY_DECK_ADB;
        if (fromEnv && fs.existsSync(fromEnv)) {
            AdbBinary.cachedPath = fromEnv;
            AdbBinary.cachedBundled = true;
            return fromEnv;
        }

        const relative = path.join('vendor', AdbBinary.platformDir(), AdbBinary.binaryName());
        for (const root of AdbBinary.candidateRoots()) {
            const candidate = path.join(root, relative);
            if (fs.existsSync(candidate)) {
                AdbBinary.cachedPath = candidate;
                AdbBinary.cachedBundled = true;
                return candidate;
            }
        }

        // Fall back to whatever `adb` is on PATH.
        AdbBinary.cachedPath = 'adb';
        AdbBinary.cachedBundled = false;
        return AdbBinary.cachedPath;
    }

    /** True when {@link resolve} found a bundled binary rather than the PATH one. */
    public static isBundled(): boolean {
        AdbBinary.resolve();
        return AdbBinary.cachedBundled;
    }

    /**
     * Runs adb with the given arguments.
     *
     * adb frequently exits 0 while still printing a failure (e.g. "failed to
     * connect"), so callers must inspect {@link AdbExecResult.stdout} rather
     * than rely on the exit code alone.
     */
    public static exec(args: string[], timeoutMs = 15000): Promise<AdbExecResult> {
        const bin = AdbBinary.resolve();
        return new Promise<AdbExecResult>((resolve) => {
            execFile(bin, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
                resolve({
                    code: error && typeof (error as NodeJS.ErrnoException).code === 'number' ? Number(error.code) : 0,
                    stdout: (stdout || '').toString().trim(),
                    stderr: (stderr || '').toString().trim(),
                    failedToSpawn: !!error && (error as NodeJS.ErrnoException).code === 'ENOENT',
                });
            });
        });
    }

    /** Ensures the adb server is running so subsequent commands are fast. */
    public static async startServer(): Promise<void> {
        await AdbBinary.exec(['start-server']);
    }
}

export interface AdbExecResult {
    code: number;
    stdout: string;
    stderr: string;
    /** True when the adb binary itself could not be found/launched. */
    failedToSpawn: boolean;
}
