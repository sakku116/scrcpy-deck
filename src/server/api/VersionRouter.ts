import { Router } from 'express';
import { checkLatestVersion, isNewerVersion } from '../checkLatestVersion';

let cache: { latest: string | null; ts: number } | null = null;
const TTL = 60 * 60 * 1000;

export function createVersionRouter(): Router {
    const router = Router();
    router.get('/', async (_req, res) => {
        if (!cache || Date.now() - cache.ts > TTL) {
            cache = { latest: await checkLatestVersion(), ts: Date.now() };
        }
        const latest = cache.latest;
        res.json({
            current: __APP_VERSION__,
            latest,
            updateAvailable: latest ? isNewerVersion(latest, __APP_VERSION__) : false,
        });
    });
    return router;
}
