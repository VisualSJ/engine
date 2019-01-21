'use strict';

import { statSync } from 'fs';
import { copy, ensureDir, existsSync, move, outputFile, remove, rename } from 'fs-extra';
import { basename, extname, join } from 'path';
import { getName } from './utils';

import { close, getReady, open, ready, setReady } from './state';

const worker = require('@base/electron-worker');

// 需要启动的多个 db 配置
const assetDBs = [
    {
        name: 'internal',
        target: join(__dirname, '../../static/internal/assets'),
    },
    {
        name: 'assets',
        target: join(Editor.Project.path, 'assets'),
    },
];

let assetWorker: any = null;
const protocol = 'db://'; // 支持多 db , 不再列出具体的 db://assets 或 db://internal

module.exports = {
    /**
     * 监听消息
     * ${action}-${method}
     */
    messages: {
        'asset-db:ready'() {
            Editor.Task.removeSyncTask(Editor.I18n.t('asset-db.mask.loading'));
        },
        'asset-db:close'() {
            Editor.Task.addSyncTask(Editor.I18n.t('asset-db.mask.loading'));
        },

        /**
         * 切换调试模式
         */
        'open-devtools'() {
            assetWorker.debug(true);
        },

        // ------ 数据库

        /**
         * 刷新 DB
         */
        refresh() {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            assetWorker.win.reload();
        },
        /**
         * DB 是否启动完毕
         */
        async 'query-ready'() {
            return getReady();
        },

        /**
         * 查询数据库 DB 的信息
         * @param nameOrUrl 可以是 name，也可以是 url
         */
        async 'query-db-info'(nameOrUrl: string) {
            if (!assetWorker) {
                return null;
            }

            return await assetWorker.send('asset-worker:query-db-info', nameOrUrl);
        },

        // ------ 资源查询

        /**
         * 查询资源树
         * @param options 筛选条件配置
         * @param options.type 资源类型（scripts\scene\...)
         * @param options.pattern db 路径匹配模式 (db://**)
         */
        async 'query-assets'(options: any) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            return await assetWorker.send('asset-worker:query-assets', options);
        },

        /**
         * 传入资源的 url，返回 uuid
         */
        async 'query-asset-uuid'(url: string) {
            if (!assetWorker) {
                return null;
            }
            return await assetWorker.send('asset-worker:query-asset-uuid', url);
        },

        /**
         * 查询资源的 url 路径
         * @param uuid 资源 uuid
         */
        async 'query-asset-url'(uuid: string) {
            if (!assetWorker) {
                return null;
            }
            return await assetWorker.send('asset-worker:query-asset-url', uuid);
        },

        /**
         * 查询资源的 url 路径
         * @param path 磁盘路径
         */
        async 'query-asset-url-by-path'(path: string) {
            if (!assetWorker) {
                return null;
            }
            return await assetWorker.send('asset-worker:query-asset-url-by-path', path);
        },

        /**
         * 查询资源信息
         * @param uuid
         */
        async 'query-asset-info'(uuid: string) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            return await assetWorker.send('asset-worker:query-asset-info', uuid);
        },

        /**
         * 查询资源的 meta 信息
         * @param uuid
         */
        async 'query-asset-meta'(uuid: string) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            return await assetWorker.send('asset-worker:query-asset-meta', uuid);
        },

        /**
         * 查询资源的磁盘文件路径
         * @param uuid
         */
        async 'query-asset-path'(uuidOrUrl: string) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }

            if (!uuidOrUrl.startsWith(protocol)) {
                // 没有以协议开头即为uuid
                const asset = await assetWorker.send('asset-worker:query-asset-info', uuidOrUrl);
                uuidOrUrl = asset.source;
            }

            const dbInfo = await assetWorker.send('asset-worker:query-db-info', uuidOrUrl);

            return join(dbInfo.target, uuidOrUrl.substr(dbInfo.protocol.length));
        },

        /**
         * 查询资源对应在 library 的资源配置
         * 返回值 比如 { '.json': 'xxxx.json' }
         * @param uuid
         */
        async 'query-asset-library'(uuid: string) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            const asset = await assetWorker.send('asset-worker:query-asset-info', uuid);

            return asset.library;
        },

        // ----- 资源增删改

        /**
         * 创建一个新的资源
         * @param url db://assets/abc.json
         * @param data 写入文件的 buffer 或者 string
         */
        async 'create-asset'(url: string, data: Buffer | string) {
            if (!assetWorker) {
                return;
            }
            if (!url.startsWith(protocol)) {
                throw new Error('Must be prefixed with db://');
            }

            const dbInfo = await assetWorker.send('asset-worker:query-db-info', url);

            // 文件目录路径
            let file = join(dbInfo.target, url.substr(dbInfo.protocol.length));

            // 获取可以使用的文件名
            file = getName(file);

            if (data === null) {
                await ensureDir(file);
            } else {
                await outputFile(file, data);
            }

            // 返回插入的文件地址
            const fileUrl = file.replace(dbInfo.target, dbInfo.protocol).replace(/\\/g, '/');
            return fileUrl;
        },

        /**
         * 保存资源
         * @param {string} uuid
         * @param {(Buffer | string)} data
         */
        async 'save-asset'(uuid: string, data: Buffer | string) {
            if (!assetWorker) {
                return;
            }
            try {
                const info = await assetWorker.send('asset-worker:query-asset-info', uuid);
                const dbInfo = await assetWorker.send('asset-worker:query-db-info', info.source);
                const file = join(dbInfo.target, info.source.substr(dbInfo.protocol.length));
                await outputFile(file, data);
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        /**
         * 保存资源的 meta 信息
         * @param {string} uuid
         * @param {*} data
         * @returns
         */
        async 'save-asset-meta'(uuid: string, meta: string) {
            if (!assetWorker) {
                return false;
            }
            try {
                const isSaved = await assetWorker.send('asset-worker:save-asset-meta', uuid, meta);
                console.info('asset meta saved');
                return isSaved;
            } catch (err) {
                console.error(err);
                return false;
            }
        },

        /**
         * 复制一个资源到指定位置
         * @param url db://assets/abc.json 或者 系统路径 如 C:\Users
         * @param to db://assets/abc
         */
        async 'copy-asset'(url: string, to: string) {
            if (!assetWorker) {
                return;
            }

            if (!to.startsWith(protocol)) {
                throw new Error('Must be prefixed with db://');
            }

            const dbInfo = await assetWorker.send('asset-worker:query-db-info', url);
            const dbInfoTo = await assetWorker.send('asset-worker:query-db-info', to);

            let dest = join(dbInfoTo.target, to.substr(dbInfoTo.protocol.length));

            if (url.startsWith(protocol)) {
                url = join(dbInfo.target, url.substr(dbInfo.protocol.length));
            }

            // 如果其中一个数据是错误的，则停止操作
            if (dest === url || !existsSync(dest) || !statSync(dest).isDirectory() || !existsSync(url)) {
                return;
            }

            // 复制文件
            const name = basename(url);
            dest = join(dest, name);
            // 获取可以使用的文件名
            dest = getName(dest);
            await copy(url, dest, {
                // @ts-ignore
                overwrite: true,
                filter(a, b) {
                    return extname(a) !== '.meta';
                },
            });

            // 返回插入的文件地址
            const fileUrl = dest.replace(dbInfoTo.target, dbInfoTo.protocol).replace(/\\/g, '/');
            return fileUrl;
        },

        /**
         * 将一个资源移动到某个地方
         * @param url 需要移动的源资源
         * @param to 移动到某个路境内
         */
        async 'move-asset'(url: string, to: string) {
            if (!assetWorker) {
                return;
            }

            const assets = {
                // 被移动的资源信息
                source: await assetWorker.send('asset-worker:translate-url', url),
                // 移动到这个资源内
                target: await assetWorker.send('asset-worker:translate-url', to),
            };

            // 如果其中一个数据是错误的，则停止操作
            if (
                assets.source === assets.target ||
                !existsSync(assets.source) ||
                !existsSync(assets.target) ||
                !statSync(assets.target).isDirectory()
            ) {
                return;
            }

            // 实际移动逻辑，首先移动 meta 文件，再移动实际文件
            const name = basename(assets.source);
            let dest = join(assets.target, name);
            dest = getName(dest); // 避免目标位置上已有相同名称的文件

            if (existsSync(dest + '.meta')) {
                await remove(dest + '.meta');
            }
            if (existsSync(dest)) {
                await remove(dest);
            }

            move(assets.source + '.meta', dest + '.meta');
            move(assets.source, dest);
        },

        /**
         * 资源重名命 rename
         * @param uuid
         * @param name
         */
        async 'rename-asset'(uuid: string, name: string) {
            if (!assetWorker) {
                return;
            }
            const info = await assetWorker.send('asset-worker:query-asset-info', uuid);
            const dbInfo = await assetWorker.send('asset-worker:query-db-info', info.source);

            // 文件目录路径
            const file = join(dbInfo.target, info.source.substr(dbInfo.protocol.length));

            const base = basename(file);

            const source = {
                file,
                meta: file + '.meta',
            };

            const target = {
                file: source.file.replace(base, name),
                meta: source.meta.replace(base, name),
            };

            if (existsSync(target.file)) {
                return false; // 新文件名已存在
            }

            rename(source.meta, target.meta);
            rename(source.file, target.file);

            return true;
        },

        /**
         * 删除某个资源
         * @param url 一个资源的 url 路径
         */
        async 'delete-asset'(url: string) {
            if (!assetWorker) {
                return;
            }

            const file = await assetWorker.send('asset-worker:translate-url', url);

            // 如果不存在，停止操作
            if (!existsSync(file)) {
                return false;
            }

            await remove(file);
            await remove(file + '.meta');

            return true;
        },

    },

    /**
     * 插件加载的时候执行的逻辑
     * 打开一个新的资源数据库
     */
    async load() {
        Editor.Task.addSyncTask(Editor.I18n.t('asset-db.mask.loading'));
        await createWorker();
    },

    /**
     * 插件关闭的时候执行的逻辑
     * 关闭打开的 AssetDB
     */
    async unload() {
        // 关闭 worker
        worker.close('asset-db');
        Editor.Ipc.sendToAll('asset-db:close');
    },
};

/**
 * 创建 asset-db 的 worker 并且初始化
 */
async function createWorker() {
    // 查询引擎数据, 并指定 worker 加载
    const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    assetWorker = worker.create('asset-db');
    await assetWorker.init();
    assetWorker.require(join(__dirname, '../../static/asset-db'));

    // 是否打开调试模式
    assetWorker.debug(false);

    // 启动 worker 后的初始化操作
    assetWorker.on('asset-worker:startup', () => {
        // 初始化自进程
        assetWorker.send('asset-worker:init', {
            engine: info.path,
            type: Editor.Project.type,
            dist: join(__dirname, '../../dist'),
            utils: info.utils,
        });

        // 启动内建数据库
        assetDBs.forEach((config: IruntimeResource) => {
            open(config.name);
            assetWorker.send('asset-worker:startup-database', legealDbConfig(config));
        });

        // 启动插件注册的数据库

        const list = Editor.Package.getPackages({
            autoEnable: true,
        });
        list.forEach((item: any) => {
            const data = item.info['runtime-resource'];
            if (!data) {
                return;
            }
            open(data.name);
            assetWorker.send(
                'asset-worker:startup-database',
                legealDbConfig({
                    name: data.name,
                    target: data.path,
                })
            );
        });
    });

    // 如果 worker 检测到正在刷新
    assetWorker.on('refresh', () => {
        setReady(false);
    });

    // 如果 worker 检测到关闭
    assetWorker.on('closed', () => {
        setReady(false);
    });

    // 更新主进程标记以及广播消息
    assetWorker.on('asset-worker:ready', async (event: any, name: string) => {
        Editor.Ipc.sendToAll('asset-db:database-ready', name);
        ready(name);
    });

    // 一个 db 被关闭了
    assetWorker.on('asset-worker:close', async (event: any, name: string) => {
        Editor.Ipc.sendToAll('asset-db:database-close', name);
        close(name);
    });

    // workder 检测到了插入资源
    assetWorker.on('asset-worker:asset-add', (event: any, uuid: string) => {
        Editor.Ipc.sendToAll('asset-db:asset-add', uuid);
    });

    // worker 检测到了修改资源
    assetWorker.on('asset-worker:asset-change', (event: any, uuid: string) => {
        Editor.Ipc.sendToAll('asset-db:asset-change', uuid);
    });

    // worker 检测到了删除资源
    assetWorker.on('asset-worker:asset-delete', (event: any, uuid: string) => {
        Editor.Ipc.sendToAll('asset-db:asset-delete', uuid);
    });
}

/**
 * 补充一个 db 的其他配置
 * @param config 来自 package.json 的 runtime-resouece 字段
 */
function legealDbConfig(config: IruntimeResource) {
    const option = {
        // 两外两个重要配置 name, target 的值，来自于参数 config
        temp: join(Editor.Project.path, 'temp/asset-db', config.name),

        // 以下配置固定
        library: join(Editor.Project.path, 'library'),
        visible: true,
        readOnly: false,
    };

    Object.assign(option, config);

    // 返回新的配置对象
    return option;
}
