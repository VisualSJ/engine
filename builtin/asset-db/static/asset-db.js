'use strict';

const { parse } = require('url');
const { join, relative } = require('path');
const { ensureDirSync } = require('fs-extra');
const { AssetDB } = require('asset-db');

let isReady = false;
let waitTask = [];
function waitReady() {
    return new Promise((resolve) => {
        if (isReady) {
            return resolve();
        }
        waitTask.push(() => {
            return resolve();
        });
    });
}

// 通知 worker 正在启动
Worker.Ipc.send('asset-worker:startup');

const AssetWorker = {
    // name: AssetDB
};

const AssetInfo = {
    engine: '',
    type: '',
    dist: '',
};

window.Manager = {
    get serialize() {
        return this._serialize();
    }
};

/**
 * 绝对路径转成相对路径
 * @param {*} db
 * @param {*} source
 */
const source2url = (name, source) => {
    const db = AssetWorker[name];

    // 将 windows 上的 \ 转成 /，统一成 url 格式
    let path = relative(db.options.target, source);
    path = path.replace(/\\/g, '/');

    return `db://${name}/${path}`;
};

/**
 * 根据 uuid 查询资源
 * @param {*} uuid
 */
const queryAsset = (uuid) => {
    const keys = Object.keys(AssetWorker);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let db = AssetWorker[key];
        let asset = db.getAsset(uuid || '');
        if (asset) {
            return {
                db: key,
                asset: asset,
            };
        }
    }
    return null;
};

// 主进程来的初始化数据
Worker.Ipc.on('asset-worker:init', async (event, info) => {
    AssetInfo.engine = info.engine;
    AssetInfo.type = info.type;
    AssetInfo.dist = info.dist;
    AssetInfo.utils = info.utils;

    Manager._serialize = function() {
        return require(info.utils + '/serialize');
    };

    // 加载引擎
    require(info.engine);
});

// 启动一个数据库
Worker.Ipc.on('asset-worker:startup-database', async (event, info) => {
    const date = new Date().getTime();
    console.log('Start the asset database...');
    // 拼接需要使用的地址
    const options = {
        target: info.assets,
        library: info.library,
    };

    // 保证文件夹存在
    ensureDirSync(options.target);
    ensureDirSync(options.library);

    // 启动资源数据库
    try {
        const db = new AssetDB(options);
        AssetWorker[info.name] = db;

        // 加载 importer
        if (AssetInfo.type === '2d') {
            const importer = require(join(AssetInfo.dist, 'importer-2d'));
            importer.register(db);
        } else {
            const importer = require(join(AssetInfo.dist, 'importer-3d'));
            importer.register(db);
        }

        // 绑定文件添加事件
        db.on('added', (uuid) => {
            Worker.Ipc.send('asset-worker:asset-add', uuid);
        });

        // 绑定文件修改事件
        db.on('changed', (uuid) => {
            Worker.Ipc.send('asset-worker:asset-change', uuid);
        });

        // 绑定文件删除事件
        db.on('deleted', (uuid) => {
            Worker.Ipc.send('asset-worker:asset-delete', uuid);
        });

        // 启动数据库
        await db.start();

        Worker.Ipc.send('asset-worker:ready', info.name);

        // 数据库就绪后，会将之前暂停的任务重新启动
        isReady = true;
        while (waitTask.length > 0) {
            let func = waitTask.shift();
            func();
        }
        console.log(`The asset database is ready: ${new Date() - date}ms`);
    } catch (error) {
        console.error(error);
    }
});

// 返回一个 db 的具体数据
Worker.Ipc.on('asset-worker:query-database-info', async (event, name) => {
    const db = AssetWorker[name];
    if (!db) {
        event.reply(null, null);
        return;
    }
    event.reply(null, db.options);
});

// 查询所有资源的列表
Worker.Ipc.on('asset-worker:query-assets', async (event) => {

    await waitReady();

    let assets = [];

    // 返回所有的资源的基础数据
    let names = Object.keys(AssetWorker);

    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const db = AssetWorker[name];
        const uuids = Object.keys(db.uuid2asset);

        for (let j = 0; j < uuids.length; j++) {
            const uuid = uuids[j];
            const asset = db.uuid2asset[uuid];
            const info = {
                source: source2url(name, asset.source),
                uuid: asset.uuid,
                importer: asset.meta.importer,
                isDirectory: await asset.isDirectory(),
                files: asset.meta.files.map((ext) => {
                    return asset.library + ext;
                }),
                subAssets: {},
            };

            /**
             * 扫描资源
             * @param {*} assets
             * @param {*} asset
             */
            function searchSubAssets(assets, asset) {
                const names = Object.keys(asset.subAssets);
                for (const name of names) {
                    const subAsset = asset.subAssets[name];
                    assets[name] = {
                        source: null,
                        uuid: subAsset.uuid,
                        importer: subAsset.meta.importer,
                        isDirectory: false,
                        files: subAsset.meta.files.map((ext) => {
                            return subAsset.library + ext;
                        }),
                        subAssets: {},
                    };
                    searchSubAssets(assets[name].subAssets, subAsset);
                }
            }

            searchSubAssets(info.subAssets, asset);

            assets.push(info);
        }
    }

    event.reply(null, assets);
});

// 传入一个 db:// 地址，返回对应的 uuid 数据
Worker.Ipc.on('asset-worker:query-asset-uuid', async (event, source) => {
    const uri = parse(source);
    if (uri.protocol !== 'db:') {
        return event.reply(null, null);
    }
    const db = AssetWorker[uri.host];
    if (!db) {
        return event.reply(null, null);
    }
    const root = db.options.target;
    const path = join(root, uri.path);
    const asset = db.path2asset[path];
    if (!asset) {
        return event.reply(null, null);
    }
    event.reply(null, asset.uuid);
});

// 查询资源的信息
Worker.Ipc.on('asset-worker:query-asset-info', async (event, uuid) => {
    if (!uuid) {
        return event.reply(null, null);
    }

    // 等待准备就绪
    await waitReady();

    // 查询资源
    const assetInfo = queryAsset(uuid);
    if (!assetInfo || !assetInfo.asset) {
        return event.reply(new Error('File does not exist.'), null);
    }

    // asset 对象
    const asset = assetInfo.asset;

    const info = {
        source: asset.source ? source2url(assetInfo.db, asset.source) : null,
        uuid: asset.uuid,
        importer: asset.meta.importer,
        isDirectory: await asset.isDirectory(),
        files: asset.meta.files.map((ext) => {
            return asset.library + ext;
        })
    };
    event.reply(null, info);
});

// 查询资源的 meta
Worker.Ipc.on('asset-worker:query-asset-meta', async (event, uuid) => {
    if (!uuid) {
        return event.reply(null, null);
    }

    await waitReady();

    const assetInfo = queryAsset(uuid);
    const asset = assetInfo.asset;
    if (!asset) {
        return event.reply(new Error('File does not exist.'), null);
    }
    event.reply(null, asset.meta);
});
