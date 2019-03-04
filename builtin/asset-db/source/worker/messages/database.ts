'use strict';

import { ensureDirSync } from 'fs-extra';
import { join } from 'path';

import { AssetDB } from '@editor/asset-db';
import { ipcAddListener, ipcSend } from '../ipc';
import { queryAsset, tranAssetInfo } from '../utils';

/**
 * 宿主进程将启动参数发送过来
 * worker 需要根据参数启动对应的引擎
 */
ipcAddListener('asset-worker:init', (event: any, info: IAssetWorkerInfo) => {
    // 加载引擎
    require(join(info.engine, './bin/.cache/dev'));
    Manager.AssetInfo = info;
    Manager.serialize = require(info.utils + '/serialize');

});

/**
 * 宿主将需要启动的 database 参数发送过来
 * worker 根据参数启动对应的数据库
 */
ipcAddListener('asset-worker:startup-database', async (event: any, info: any) => {
    const date = new Date().getTime();
    console.log(`Start the '${info.name}' database...`);

    // 保证文件夹存在
    ensureDirSync(info.target);
    ensureDirSync(info.library);
    ensureDirSync(info.temp);

    // 启动并缓存到全局
    const db = new AssetDB(info);
    Manager.AssetWorker[info.name] = db;

    // 判断项目类型，加载对应的 importer
    if (Manager.AssetInfo.type === '2d') {
        const importer = require(join(Manager.AssetInfo.dist, 'importer-2d'));
        importer.register(db);
    } else {
        const importer = require(join(Manager.AssetInfo.dist, 'importer-3d'));
        importer.register(db);
    }

    db.on('add', (uuid) => {
        console.info(`Import: ${uuid}`);
    });

    db.on('delete', (uuid) => {
        console.info(`Destory: ${uuid}`);
    });

    // 绑定文件添加事件
    db.on('added', (uuid) => {
        ipcSend('asset-worker:asset-add', uuid, db.uuidToPath(uuid));
    });

    // 绑定文件修改事件
    db.on('changed', (uuid) => {
        ipcSend('asset-worker:asset-change', uuid, db.uuidToPath(uuid));
    });

    // 绑定文件删除事件
    db.on('delete', (uuid) => {
        ipcSend('asset-worker:asset-delete', uuid, tranAssetInfo(db.uuid2asset[uuid]), db.uuidToPath(uuid));
    });

    // 启动数据库
    await db.start();
    ipcSend('asset-worker:ready', info.name);

    console.log(`The '${info.name}' database is started: ${new Date().getTime() - date}ms`);
});

/**
 * 宿主请求关闭一个数据库
 */
ipcAddListener('asset-worker:shutdown-database', async (event: any, name: string) => {
    const database = Manager.AssetWorker[name];
    await database.stop();
    delete Manager.AssetWorker[name];
    ipcSend('asset-worker:close', name);
});

/**
 * 宿主请求关闭一个数据库
 */
ipcAddListener('asset-worker:pause-database', async (event: any, name: string) => {
    const database = Manager.AssetWorker[name];
    await database.pause();
    event.reply();
});

/**
 * 宿主请求关闭一个数据库
 */
ipcAddListener('asset-worker:resume-database', async (event: any, name: string) => {
    const database = Manager.AssetWorker[name];
    await database.resume();
    event.reply();
});
