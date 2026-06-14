import express, { Request, Response, Router } from 'express';
import { WirelessService } from '../wireless/WirelessService';
import { AdbBinary } from '../adb/AdbBinary';
import {
    AdbInfoResult,
    ConnectRequest,
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

    router.use(express.json());

    router.post('/tcpip', async (req: Request, res: Response) => {
        const { serial, port } = req.body as TcpipRequest;
        res.json(await service.tcpipConnect(serial, port));
    });

    router.post('/pair', async (req: Request, res: Response) => {
        const { host, port, code } = req.body as PairRequest;
        res.json(await service.pair(host, port, code));
    });

    router.post('/connect', async (req: Request, res: Response) => {
        const { host, port } = req.body as ConnectRequest;
        res.json(await service.connect(host, port));
    });

    router.post('/disconnect', async (req: Request, res: Response) => {
        const { target } = req.body as DisconnectRequest;
        res.json(await service.disconnect({ target }));
    });

    router.get('/devices', async (_req: Request, res: Response) => {
        const devices = await service.listDevices();
        const result: DevicesResult = { success: true, message: 'ok', devices };
        res.json(result);
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
