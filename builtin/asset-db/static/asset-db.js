'use strict';

const { parse } = require('url');
const { join, relative, isAbsolute, resolve } = require('path');
const { ensureDirSync } = require('fs-extra');
const { AssetDB, version, queryUrlFromPath } = require('@editor/asset-db');
const minimatch = require('minimatch');
const protocol = 'db://';
let isReady = false;
let waitTask = [];
const type2importer = {
    scripts: ['javascript', 'coffeescript', 'typescript'],
    scene: ['scene'],
};
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
    AssetInfo,
    AssetWorker,
    get serialize() {
        return this._serialize();
    },
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

        if (!db) {
            return null;
        }

        // 查找的是数据库
        if (uuid === `db://${key}`) {
            return {
                db: key,
                asset: {
                    source: `db://${key}`,
                    uuid: `db://${key}`,
                    isDirectory() {
                        return false;
                    },
                    meta: { importer: 'database', files: [] },
                },
            };
        }

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
    require(join(info.engine, './bin/.cache/dev'));
});

// 启动一个数据库
Worker.Ipc.on('asset-worker:startup-database', async (event, info) => {
    if (info.name === 'internal' && !version) {
        console.warn(`Try 'npm run update -- --module asset-db' within the bash.`);
        return;
    }

    const date = new Date().getTime();
    console.log(`Start the '${info.name}' database...`);
    // 拼接需要使用的地址
    const options = Object.assign(
        {
            protocol: protocol + info.name, // 方便后续协议和路径的替换
        },
        info
    );

    // 保证文件夹存在
    ensureDirSync(options.target);
    ensureDirSync(options.library);
    ensureDirSync(options.temp);

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
        console.log(`The '${info.name}' database is started: ${new Date() - date}ms`);
    } catch (error) {
        console.error(error);
    }
});

// 停止一个数据库
Worker.Ipc.on('asset-worker:shutdown-database', async (event, name) => {
    const db = AssetWorker[name];
    db.stop();
    delete AssetWorker[name];
    Worker.Ipc.send('asset-worker:close', name);
});

// 翻译 url
Worker.Ipc.on('asset-worker:translate-url', async (event, url) => {
    if (isAbsolute(url)) {
        return event.reply(null, url);
    }

    const uri = parse(url);

    if (uri.protocol !== 'db:') {
        return event.reply(null, '');
    }

    let db = AssetWorker[uri.host];
    if (!db) {
        return event.reply(null, '');
    }

    event.reply(null, join(db.options.target, unescape(uri.path || '')));
});

Worker.Ipc.on('asset-worker:query-db-info', async (event, names) => {
    event.reply(null, queryDatabaseInfo(names));
});

Worker.Ipc.on('asset-worker:query-asset-url-by-path', async (event, path) => {
    event.reply(null, queryUrlFromPath(path));
});

// 查询所有资源的列表
Worker.Ipc.on('asset-worker:query-assets', async (event, options) => {
    await waitReady();

    let assets = [];

    // 返回所有的资源的基础数据
    let names = Object.keys(AssetWorker);

    // 多 db 配置信息
    const dbInfos = queryDatabaseInfo(names);

    // 循环每个启动的 db
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const db = AssetWorker[name];
        const uuids = Object.keys(db.uuid2asset);
        let importers;
        // 存在筛选的 type(资源类型) 变量时，先判断是否有效后获取筛选对应类型资源
        if (options && options.type) {
            importers = type2importer[options.type];
        }

        // 当前 db 内的所有资源
        for (let j = 0; j < uuids.length; j++) {
            const uuid = uuids[j];
            const asset = db.uuid2asset[uuid];
            if (importers && !importers.includes(asset.meta.importer)) {
                continue;
            }
            let source = source2url(name, asset.source);
            // 存在路径筛选配置，并且当前路径不符合条件
            if (options && options.pattern && !minimatch(source, options.pattern)) {
                continue;
            }
            const importer = db.name2importer[asset.meta.importer] || null;

            // 需要 redirect 数据的情况
            const redirect = getRedirectAssetInfo(asset.meta.userData.redirect);

            const info = {
                source,
                file: asset.source, // 实际磁盘路径
                uuid: asset.uuid,
                importer: asset.meta.importer,
                type: importer.assetType || 'cc.Asset',
                isDirectory: await asset.isDirectory(),
                library: getLibrary(asset),
                loadPluginInNative: asset.meta.loadPluginInNative,
                loadPluginInWeb: asset.meta.loadPluginInWeb,
                platformSettings: asset.meta.platformSettings,
                isPlugin: asset.meta.isPlugin,
                subAssets: {},
                visible: dbInfos[name].visible,
                readOnly: dbInfos[name].readOnly,
                redirect,
            };

            searchSubAssets(info, asset, db);

            assets.push(info);
        }
        // 存在筛选条件时无需返回 database 类型的资源
        if (options && Object.keys(options).length > 0) {
            continue;
        }
        // 手动添加 db 对象
        assets.push({
            source: `db://${name}`,
            file: db.options.target, // 实际磁盘路径
            uuid: `db://${name}`,
            importer: 'database',
            isDirectory: false,
            library: {},
            subAssets: {},
            visible: dbInfos[name].visible,
            readOnly: dbInfos[name].readOnly,
        });
    }

    event.reply(null, assets);
});

// 传入一个 db:// 地址，返回对应的 uuid 数据
Worker.Ipc.on('asset-worker:query-asset-uuid', async (event, url) => {
    if (!url.startsWith('db://')) {
        return event.reply(null, null);
    }
    const uri = parse(url);
    const db = AssetWorker[uri.host];
    if (!db) {
        return event.reply(null, null);
    }
    const root = db.options.target;
    const path = unescape(join(root, uri.path));
    const asset = db.path2asset[path];
    if (!asset) {
        return event.reply(null, null);
    }
    event.reply(null, asset.uuid);
});

// 传入一个 uuid ，返回 db:// 地址
Worker.Ipc.on('asset-worker:query-asset-url', async (event, uuid) => {
    // 查询资源
    const assetInfo = queryAsset(uuid);
    if (!assetInfo || !assetInfo.asset) {
        return event.reply(new Error('File does not exist.'), null);
    }

    event.reply(null, assetInfo.asset.source);
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

    const dbInfo = queryDatabaseInfo(assetInfo.db);

    const db = AssetWorker[assetInfo.db];
    const importer = db ? db.name2importer[asset.meta.importer] : null;

    // 需要 redirect 数据的情况
    const redirect = getRedirectAssetInfo(asset.meta.userData.redirect);

    const info = {
        uuid: asset.uuid,
        importer: asset.meta.importer,
        type: importer ? importer.assetType || 'cc.Asset' : 'cc.Asset',
        source: asset.source ? source2url(assetInfo.db, asset.source) : null,
        file: asset.source,
        library: getLibrary(asset),
        isDirectory: await asset.isDirectory(),
        platformSettings: asset.meta.platformSettings,
        visible: dbInfo.visible,
        readOnly: dbInfo.readOnly,
        subAssets: {},
        redirect,
    };

    searchSubAssets(info, asset, db);

    event.reply(null, info);
});

// 查询资源的 meta
Worker.Ipc.on('asset-worker:query-asset-meta', async (event, uuid) => {
    if (!uuid) {
        return event.reply(null, null);
    }

    await waitReady();

    const assetInfo = queryAsset(uuid);
    if (!assetInfo) {
        return event.reply(null, null);
    }
    const asset = assetInfo.asset;
    if (!asset) {
        return event.reply(new Error('File does not exist.'), null);
    }
    event.reply(null, asset.meta);
});

// 保存资源的 meta
Worker.Ipc.on('asset-worker:save-asset-meta', async (event, uuid, data) => {
    if (!uuid) {
        return event.reply(null, null);
    }
    const { asset, db } = queryAsset(uuid) || {};
    if (!asset) {
        return event.reply(null, isSaved);
    }
    try {
        let isSaved = false;
        const meta = JSON.parse(data);
        Object.keys(asset.meta).map((key) => {
            if (meta[key] !== undefined) {
                asset.meta[key] = meta[key];
            }
        });
        isSaved = await asset.save();
        AssetWorker[db].reimport(asset.uuid);

        return event.reply(null, isSaved);
    } catch (err) {
        console.error(err);
        return event.reply(null, false);
    }
});

/**
 * 设置 asset 的 library 字段
 * @param {*} asset
 */
function getLibrary(asset) {
    const rt = {};

    asset.meta.files.forEach((ext) => {
        if (/\.\w+/.test(ext)) {
            // is extname
            rt[ext] = asset.library + ext;
        } else {
            rt[ext] = resolve(asset.library, ext);
        }
    });

    return rt;
}

/**
 * 扫描资源
 * @param {*} parent
 * @param {*} asset
 */
function searchSubAssets(parent, asset, db) {
    const names = Object.keys(asset.subAssets || {});
    for (const name of names) {
        const subAsset = asset.subAssets[name];
        const importer = db.name2importer[subAsset.meta.importer] || null;

         // 需要 redirect 数据的情况
        const redirect = getRedirectAssetInfo(subAsset.meta.userData.redirect);

        parent.subAssets[name] = {
            uuid: subAsset.uuid,
            importer: subAsset.meta.importer,
            type: importer ? importer.assetType || 'cc.Asset' : 'cc.Asset',
            source: null,
            file: null,
            library: getLibrary(subAsset),
            isDirectory: false,
            visible: parent.visible,
            readOnly: parent.readOnly,
            subAssets: {},
            redirect,
        };
        searchSubAssets(parent.subAssets[name], subAsset, db);
    }
}

/**
 * 返回单个或多个 db 的配置数据，
 * 单个返回直接是一个 options
 * 多个返回是 { nameA: options, nameB: options }
 * 传入 url 获取该资源所在 db 的信息，信息数据格式为 json, 字段类似如下（window 10）：
 * db://assets 类似如下
 * protocol: db://assets
 * library:"G:\cocos-creator\editor-3d\.project-2d\library"
 * target:"G:\cocos-creator\editor-3d\.project-2d\assets"
 * temp:"G:\cocos-creator\editor-3d\.project-2d\temp\asset-db"
 * visible: true,
 * readOnly: false,
 * @param {*} names
 */
function queryDatabaseInfo(names) {
    if (!names) {
        // 有可能传 null 进来
        return {};
    }

    // 支持多个查询
    const isArray = Array.isArray(names);
    if (!isArray) {
        names = [names];
    }

    const dbInfos = {};
    names.forEach((name) => {
        if (name.startsWith(protocol)) {
            // arr 数据格式为 ['db:', 'assets', 其他文件夹路径...]
            const arr = name.split('/').filter(Boolean);
            name = arr[1];
        }

        const db = AssetWorker[name];

        if (!db) {
            dbInfos[name] = null;
        } else {
            dbInfos[name] = db.options;
        }
    });

    if (!isArray) {
        return Object.values(dbInfos)[0];
    }

    return dbInfos;
}

/**
 * 获取资源的链接资源相关信息
 * @param {*} redirect
 */
function getRedirectAssetInfo(redirect) {
    if (!redirect) {
        return;
    }

    const assetInfo = queryAsset(redirect);
    if (!assetInfo || !assetInfo.asset) {
        return new Error('Redirect File does not exist.');
    }

    const asset = assetInfo.asset;

    const db = AssetWorker[assetInfo.db];
    const importer = db ? db.name2importer[asset.meta.importer] : null;

    return {
        type: importer ? importer.assetType || 'cc.Asset' : 'cc.Asset',
        uuid: asset.uuid,
    };
}

process.on('uncaughtException', function(err) {
    console.error(err);
});
