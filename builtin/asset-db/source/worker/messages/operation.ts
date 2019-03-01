'use strict';

import { ipcAddListener } from '../ipc';
import { queryAsset } from '../utils';

/**
 * 存储指定的资源的 meta
 */
ipcAddListener('asset-worker:save-asset-meta', async (event: any, uuid: string, content: string) => {
    if (!uuid) {
        return event.reply(null, false);
    }
    const info = queryAsset(uuid);
    if (!info) {
        return event.reply(null, false);
    }
    try {
        let isSaved = false;
        const meta = JSON.parse(content);
        if (Array.isArray(meta)) { // 不能为数组
            return event.reply(null, false);
        }

        Object.keys(info.asset.meta).map((key) => {
            if (meta[key] !== undefined) {
                // @ts-ignore
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
