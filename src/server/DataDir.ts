import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { EnvName } from './EnvName';

const IS_PACKAGED = !!(process as unknown as { pkg?: unknown }).pkg;

function resolveDataDir(): string {
    const fromEnv = process.env[EnvName.DATA_DIR];
    if (fromEnv) return path.resolve(fromEnv);
    if (IS_PACKAGED) return path.join(path.dirname(process.execPath), 'data');
    return path.join(process.cwd(), 'data');
}

export const DATA_DIR: string = resolveDataDir();

export function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
