import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIR, ensureDataDir } from './DataDir';

const STORE_FILE = path.join(DATA_DIR, 'devices.json');

export interface DeviceEntry {
    ip: string;
    port: number;
    lastConnected: string;
}

interface StoreShape {
    history: DeviceEntry[];
}

export class DeviceStore {
    private static instance: DeviceStore;
    private data: StoreShape = { history: [] };

    public static getInstance(): DeviceStore {
        if (!DeviceStore.instance) {
            DeviceStore.instance = new DeviceStore();
            DeviceStore.instance.load();
        }
        return DeviceStore.instance;
    }

    private load(): void {
        try {
            if (fs.existsSync(STORE_FILE)) {
                this.data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as StoreShape;
            }
        } catch {
            this.data = { history: [] };
        }
    }

    private save(): void {
        ensureDataDir();
        fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    }

    public getHistory(): DeviceEntry[] {
        return [...this.data.history];
    }

    public upsert(ip: string, port: number): void {
        const existing = this.data.history.find((e) => e.ip === ip && e.port === port);
        if (existing) {
            existing.lastConnected = new Date().toISOString();
        } else {
            this.data.history.unshift({ ip, port, lastConnected: new Date().toISOString() });
        }
        this.save();
    }

    public remove(ip: string, port: number): void {
        this.data.history = this.data.history.filter((e) => !(e.ip === ip && e.port === port));
        this.save();
    }
}
