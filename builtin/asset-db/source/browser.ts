'use stirct';

import { statSync } from 'fs';
import { copy, ensureDir, existsSync, move, outputFile, remove, rename } from 'fs-extra';
import { basename, extname, join, relative } from 'path';
import { parse } from 'url';
import { getName } from './utils';

const worker = require('@base/electron-worker');

let isReady: boolean = false;
let assetWorker: any = null;
const assetProtocol = 'db://assets';

module.exports = {
    /**
     * 监听消息
     * ${action}-${method}
     */
    messages: {
        /**
         * 查询是否准备完成
         */
        'query-is-ready'() {
            return isReady;
        },

        /**
         * 重启刷新数据库
         */
        'refresh-database'() {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            assetWorker.win.reload();
        },

        /**
         * 切换调试模式
         */
        'open-devtools'() {
            assetWorker.debug(true);
        },

        /**
         * 查询资源树
         */
        async 'query-assets'(options: any) {
            if (!assetWorker) {
                throw new Error('Asset DB does not exist.');
            }
            return await assetWorker.send('asset-worker:query-assets');
        },

        /**
         * 传入资源的路径，返回 uuid
         */
        async 'query-asset-uuid'(source: string) {
            if (!assetWorker) {
                return null;
            }
            return await assetWorker.send('asset-worker:query-asset-uuid', source);
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
         * 创建一个新的资源
         * @param url db://assets/abc.json
         * @param data
         */
        async 'create-asset'(url: string, data: Buffer | string, isImport = false) {
            if (!assetWorker) {
                return;
            }
            if (!url.startsWith(assetProtocol)) {
                throw new Error('Must be prefixed with db://assets');
            }

            // 文件目录路径
            const dirname = join(Editor.Project.path, 'assets');
            let file = join(dirname, url.substr(assetProtocol.length));

            // 获取可以使用的文件名
            file = getName(file);

            if (data === null) {
                await ensureDir(file);
            } else {
                await outputFile(file, data);
            }

            // 返回插入的文件地址
            return 'db://' + relative(Editor.Project.path, file);
        },

        /**
         * 从外部拖拽，导入文件
         * @param url
         * @param path 系统文件路径或者 asset-db 资源路径
         */
        async 'import-asset'(url: string, path: string) {
            if (!assetWorker) {
                return;
            }
            if (!url.startsWith(assetProtocol)) {
                throw new Error('Must be prefixed with db://assets');
            }

            // 文件目录路径
            const dirname = join(Editor.Project.path, 'assets');
            let dest = join(dirname, url.substr(assetProtocol.length));

            // 判断是否是资源路径
            if (path.startsWith(assetProtocol)) {
                path = join(dirname, path.substr(assetProtocol.length));
            }

            // 如果其中一个数据是错误的，则停止操作
            if (
                dest === path ||
                !existsSync(dest) ||
                !statSync(dest).isDirectory() ||
                !existsSync(path)
            ) {
                return;
            }

            // 复制文件
            const name = basename(path);
            dest = join(dest, name);
            copy(path, dest, {
                // @ts-ignore
                overwrite: true,
                filter(a, b) {
                    return extname(a) !== '.meta';
                }
            });
        },

        /**
         * 将一个资源移动到某个地方
         * @param uuid
         * @param target
         */
        async 'move-asset'(uuid: string, target: string) {
            if (!assetWorker) {
                return;
            }
            const assets = {
                // assets 目录
                dirname: join(Editor.Project.path, 'assets'),
                // 被移动的资源信息
                source: await assetWorker.send('asset-worker:query-asset-info', uuid),
                // 移动到这个资源内
                target: await assetWorker.send('asset-worker:query-asset-info', target),
            };

            const path = {
                source: join(assets.dirname, assets.source.source.replace(assetProtocol, '')),
                target: join(assets.dirname, assets.target.source.replace(assetProtocol, '')),
            };

            // 如果其中一个数据是错误的，则停止操作
            if (
                assets.source.source === assets.target.source ||
                !existsSync(path.source) ||
                !existsSync(path.target) ||
                !statSync(path.target).isDirectory()
            ) {
                return;
            }

            // 实际移动逻辑，首先移动 meta 文件，再移动实际文件
            const name = basename(path.source);
            move(path.source + '.meta', join(path.target, name) + '.meta');
            move(path.source, join(path.target, name));
        },

        /**
         * 资源重名命 rename
         * @param uuid
         * @param target
         */
        async 'rename-asset'(uuid: string, name: string) {
            if (!assetWorker) {
                return;
            }
            const dir = join(Editor.Project.path, 'assets');
            const info = await assetWorker.send('asset-worker:query-asset-info', uuid);

            const file = join(dir, info.source);
            const ext = extname(file);
            const base = basename(file, ext);

            const target = file.replace(base, name);
            rename(file, target);
        },

        /**
         * 删除某个资源
         * @param uuid
         */
        async 'delete-asset'(uuid: string) {
            if (!assetWorker) {
                return;
            }

            const info = await assetWorker.send('asset-worker:query-asset-info', uuid);
            const uri = parse(info.source);
            const data = await assetWorker.send('asset-worker:query-database-info', uri.host);
            const file = join(data.target, decodeURIComponent(uri.path || ''));
            // 如果不存在，停止操作
            if (!existsSync(file)) {
                return;
            }

            await remove(file);
            await remove(file + '.meta');
        }
    },

    /**
     * 插件加载的时候执行的逻辑
     * 打开一个新的资源数据库
     */
    async load() {
        await createWorker();
    },

    /**
     * 插件关闭的时候执行的逻辑
     * 关闭打开的 AssetDB
     */
    async unload() {
        // 关闭 worker
        worker.close('asset-db');

        // 更新主进程标记以及广播消息
        isReady = false;
        Editor.Ipc.sendToAll('asset-db:close');
    }
};

/**
 * 创建 asset-db 的 worker 并且初始化
 */
async function createWorker() {
    // 查询引擎数据, 并指定 worker 加载
    const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    assetWorker = worker.create('asset-db');
    await assetWorker.init();
    assetWorker.require(join(__dirname, '../static/asset-db'));

    // 是否打开调试模式
    assetWorker.debug(false);

    // 启动 worker 后的初始化操作
    assetWorker.on('asset-worker:startup', () => {
        assetWorker.send('asset-worker:init', {
            engine: info.path,
            type: Editor.Project.type,
            dist: join(__dirname, '../dist'),
            utils: info.utils,
        });

        assetWorker.send('asset-worker:startup-database', {
            name: 'assets',
            assets: join(Editor.Project.path, 'assets'),
            library: join(Editor.Project.path, 'library'),
        });
    });

    // 如果 worker 检测到正在刷新
    assetWorker.on('refresh', () => {
        Editor.Ipc.sendToAll('asset-db:close');
        isReady = false;
    });

    // 如果 worker 检测到关闭
    assetWorker.on('closed', () => {
        Editor.Ipc.sendToAll('asset-db:close');
        isReady = false;
    });

    // 更新主进程标记以及广播消息
    assetWorker.on('asset-worker:ready', async (event: any, name: string) => {
        if (name !== 'assets') {
            return;
        }
        Editor.Ipc.sendToAll('asset-db:ready');
        isReady = true;
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
