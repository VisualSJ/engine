'use strict';

import { ipcAddListener } from '../ipc';
import { queryAsset } from '../utils';

/**
 * 存储指定的资源的 meta
 */
ipcAddListener('asset-worker:save-asset-meta', async (event: any, uuid: string, data: any) => {
    if (!uuid) {
        return event.reply(null, null);
    }
    const info = queryAsset(uuid);
    if (!info) {
        return event.reply(null);
    }
    try {
        let isSaved = false;
        const meta = JSON.parse(data);
        Object.keys(info.asset.meta).map((key) => {
            if (meta[key] !== undefined) {
                info.asset.meta[key] = meta[key];
            }
        });
        isSaved = await info.asset.save();
        Manager.AssetWorker[info.name].reimport(info.asset.uuid);

        return event.reply(null, isSaved);
    } catch (err) {
        console.error(err);
        return event.reply(null, false);
    }
});
