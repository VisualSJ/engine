'use strict';

import { extname, isAbsolute, join } from 'path';
import { parse } from 'url';

import { queryUrlFromPath } from '@editor/asset-db';

import { ipcAddListener } from '../ipc';
import { encodeAsset, queryAsset } from '../utils';

const minimatch = require('minimatch');
// 对资源进来分类，方便筛选
const TYPES: any = {
    scripts: ['.js', '.ts'],
    scene: ['.scene', '.fire'],
};

/**
 * 将一个 url 转换成文件系统的实际路径
 */
ipcAddListener('asset-worker:translate-url', (event: any, url: string) => {
    if (isAbsolute(url)) {
        return event.reply(null, url);
    }

    const uri = parse(url);

    if (uri.protocol !== 'db:') {
        return event.reply(null, '');
    }

    const database = Manager.AssetWorker[uri.host || ''];
    if (!database) {
        return event.reply(null, '');
    }

    event.reply(null, join(database.options.target, unescape(uri.path || '')));
});

/**
 * 查询一个数据库的具体数据
 */
ipcAddListener('asset-worker:query-db-info', async (event: any, name: string) => {
    // 如果传入的是一个 url，则取 url 指示的 db 名字
    if (name.startsWith('db://')) {
        const splits = name.split('/').filter(Boolean);
        name = splits[1];
    }

    const database = Manager.AssetWorker[name];
    if (database && database.options) {
        event.reply(null, database.options);
        return;
    }
    event.reply(new Error(`The database doesn't exist: ${name}`));
});

/**
 * 通过一个文件系统路径，查询数据库内对应的 url 地址
 */
ipcAddListener('asset-worker:query-asset-url-by-path', async (event: any, path: string) => {
    event.reply(null, queryUrlFromPath(path));
});

/**
 * 根据提供的 options 查询对应的资源数组
 */
ipcAddListener('asset-worker:query-assets', async (event: any, options: any) => {
    options = options || {};

    let assets: IAssetInfo[] = [];

    // 循环每一个已经启动的 database
    for (const name in Manager.AssetWorker) {
        if (!(name in Manager.AssetWorker)) {
            continue;
        }
        const database = Manager.AssetWorker[name];

        // 手动添加 db 对象
        assets.push({
            name,
            source: `db://${name}`,
            file: database.options.target, // 实际磁盘路径
            uuid: `db://${name}`,
            importer: 'database',
            type: 'database',
            isDirectory: false,
            library: {},
            subAssets: {},
            visible: database.options.visible,
            readOnly: database.options.readOnly,
        });

        // 循环 database 内每一个资源
        for (const uuid in database.uuid2asset) {
            if (!(uuid in database.uuid2asset)) {
                continue;
            }
            const info = await encodeAsset(database, database.uuid2asset[uuid]);
            assets.push(info);
        }
    }

    if (options.pattern && typeof options.pattern === 'string') {
        // TODO
        assets = assets.filter((info: IAssetInfo) => {
            return minimatch(info.source, options.pattern);
        });
    }
    if (options.type && TYPES[options.type]) {
        // TODO 这里只过滤了实体资源，虚拟资源无法查询
        assets = assets.filter((info: IAssetInfo) => {
            return TYPES[options.type].includes(extname(info.source));
        });
    }

    event.reply(null, assets);
});

/**
 * 传入一个 db 协议地址，将其转成对应的 uuid
 */
ipcAddListener('asset-worker:query-asset-uuid', (event: any, url: string) => {
    if (!url.startsWith('db://')) {
        return event.reply(null, null);
    }
    const uri = parse(url);
    const database = Manager.AssetWorker[uri.host || ''];
    if (!database) {
        return event.reply(null, null);
    }
    const root = database.options.target;
    const path = unescape(join(root, uri.path || ''));
    const asset = database.path2asset[path];
    if (!asset) {
        return event.reply(null, null);
    }
    event.reply(null, asset.uuid);
});

/**
 * 查询指定资源的 url 地址
 * todo asset.source 应该是绝对地址，不是 url
 */
ipcAddListener('asset-worker:query-asset-url', (event: any, uuid: string) => {
    // 查询资源
    const info = queryAsset(uuid);
    if (!info || !info.asset) {
        return event.reply(new Error('The specified resource could not be found.'), null);
    }

    event.reply(null, info.asset.source);
});

/**
 * 查询指定资源的信息
 */
ipcAddListener('asset-worker:query-asset-info', async (event: any, uuid: string) => {
    // 查询资源IAssetInfo
    if (!uuid) {
        return event.reply(null, null);
    }

    // 查询资源
    const info = queryAsset(uuid);
    if (!info || !info.asset) {
        return event.reply(new Error('File does not exist.'), null);
    }

    const asset = info.asset;
    const database = Manager.AssetWorker[info.name];
    const assetInfo = await encodeAsset(database, asset);

    event.reply(null, assetInfo);
});

/**
 * 查询指定的资源的 meta
 */
ipcAddListener('asset-worker:query-asset-meta', (event: any, uuid: string) => {
    if (!uuid) {
        return event.reply(null, null);
    }

    const info = queryAsset(uuid);
    if (!info) {
        return event.reply(null, null);
    }

    const asset = info.asset;
    if (!asset) {
        return event.reply(new Error('The specified resource could not be found.'), null);
    }
    event.reply(null, asset.meta);
});
