import express, { Request, Response, Router } from 'express';
import { WirelessService } from '../wireless/WirelessService';
import { AdbBinary } from '../adb/AdbBinary';
import { DeviceStore } from '../DeviceStore';
import { DeviceWatcher } from '../wireless/DeviceWatcher';
import {
    AdbInfoResult,
    ConnectRequest,
    DeviceHistoryResult,
    DevicesResult,
    DisconnectRequest,
    PairRequest,
    TcpipRequest,
} from '../../common/WirelessTypes';

/**
 * Thin HTTP layer over {@link WirelessService}. Controllers only parse the
 * request body and delegate; all adb logic lives in the service. Mounted at
 * `WIRELESS_API_BASE` by {@link HttpServer}.
 */
export function createWirelessRouter(): Router {
    const router = express.Router();
    const service = WirelessService.getInstance();
    const store = DeviceStore.getInstance();

    router.use(express.json());

    router.post('/tcpip', async (req: Request, res: Response) => {
        const { serial, port } = req.body as TcpipRequest;
        const result = await service.tcpipConnect(serial, port);
        if (result.success && result.ip) {
            store.upsert(result.ip, result.target ? parseInt(result.target.split(':')[1], 10) : 5555);
        }
        res.json(result);
    });

    router.post('/pair', async (req: Request, res: Response) => {
        const { host, port, code } = req.body as PairRequest;
        res.json(await service.pair(host, port, code));
    });

    router.post('/connect', async (req: Request, res: Response) => {
        const { host, port } = req.body as ConnectRequest;
        const result = await service.connect(host, port);
        if (result.success) {
            store.upsert(host, port);
            // Clear any manual-disconnect pause so auto-reconnect resumes.
            DeviceWatcher.getInstance().resumeReconnect(`${host}:${port}`);
        }
        res.json(result);
    });

    router.post('/disconnect', async (req: Request, res: Response) => {
        const { target, manual } = req.body as DisconnectRequest;
        if (manual && target) {
            DeviceWatcher.getInstance().pauseReconnect(target);
        }
        res.json(await service.disconnect({ target }));
    });

    router.get('/devices', async (_req: Request, res: Response) => {
        const devices = await service.listDevices();
        const result: DevicesResult = { success: true, message: 'ok', devices };
        res.json(result);
    });

    router.get('/history', (_req: Request, res: Response) => {
        const result: DeviceHistoryResult = {
            success: true,
            message: 'ok',
            history: store.getHistory(),
        };
        res.json(result);
    });

    router.delete('/history', (req: Request, res: Response) => {
        const { ip, port } = req.body as { ip: string; port: number };
        if (!ip || !port) {
            res.status(400).json({ success: false, message: 'ip and port are required.' });
            return;
        }
        store.remove(ip, port);
        res.json({ success: true, message: 'Removed.' });
    });

    router.get('/adb-info', async (_req: Request, res: Response) => {
        const version = await AdbBinary.exec(['--version']);
        const result: AdbInfoResult = {
            success: !version.failedToSpawn,
            message: version.failedToSpawn ? 'adb binary not found.' : 'ok',
            path: AdbBinary.resolve(),
            bundled: AdbBinary.isBundled(),
            version: version.failedToSpawn ? undefined : version.stdout.split('\n')[0],
        };
        res.json(result);
    });

    return router;
}
