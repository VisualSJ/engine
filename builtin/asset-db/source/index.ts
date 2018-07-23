'use stirct';

import { existsSync } from 'fs';
import { join, relative } from 'path';
import { ensureDirSync, outputFileSync, removeSync } from 'fs-extra'; 
import { AssetDB } from 'asset-db';

let isReady: boolean = false;
let database: AssetDB | null = null;

interface AssetInfo {
    source: string;
    uuid: string;
    importer: string; // meta 内存储的导入器名字
}

let source2url = function (source: string) {
    if (!database) {
        return '';
    }
    return relative(database.options.target, source);
}

module.exports = {

    /**
     * 监听消息
     * ${action}-${method}
     */
    messages: {
        /**
         *  查询是否准备完成
         * @param {*} event 
         */
        'query-is-ready' (event: IPCEvent) {
            event.reply(null, isReady);
        },

        /**
         * 查询资源树
         * @param event 
         */
        'query-assets' (event: IPCEvent, options: any) {
            if (!database) {
                event.reply(new Error('Asset DB does not exist.'), null);
                return;
            }

            // 返回所有的资源的基础数据
            event.reply(null, Object.keys(database.uuid2asset).map((uuid) => {
                if (!database) {
                    return null;
                }
                let asset = database.uuid2asset[uuid];
                let info: AssetInfo = {
                    source: source2url(asset.source),
                    uuid: asset.uuid,
                    importer: asset.meta.importer,
                };
                return info;
            }));
        },

        /**
         * 查询资源信息
         * @param event 
         * @param uuid
         */
        'query-asset-info' (event: IPCEvent, uuid: string) {
            if (!database) {
                return event.reply(new Error('Asset DB does not exist.'), null);
            }
            let asset = database.uuid2asset[uuid];
            if (!asset) {
                return event.reply(new Error('File does not exist.'), null);
            }
        
            let info: AssetInfo = {
                source: source2url(asset.source),
                uuid: asset.uuid,
                importer: asset.meta.importer,
            };
            event.reply(null, info);
        },

        /**
         * 查询资源的 meta 信息
         * @param event 
         * @param uuid
         */
        'query-asset-meta' (event: IPCEvent, uuid: string) {
            if (!database) {
                return event.reply(new Error('Asset DB does not exist.'), null);
            }
            let asset = database.uuid2asset[uuid];
            if (!asset) {
                return event.reply(new Error('File does not exist.'), null);
            }
            event.reply(null, asset.meta);
        },

        /**
         * 创建一个新的资源
         * @param event 
         * @param url db://assets/abc.json 
         * @param data 
         */
        'create-asset' (event: IPCEvent, url: string, data: Buffer | string) {
            if (!database) {
                return;
            }

            if (!url.startsWith('db://assets')) {
                // todo info
                return;
            }

            url = url.substr(12);

            // 文件目录路径
            let dirname = database.options.target;
            let file = join(dirname, url);

            if (existsSync(file)) {
                // todo info
                return;
            }

            outputFileSync(file, data);
        },

        /**
         * 将一个资源移动到某个地方
         * 更名操作也可以调用 move
         * @param event 
         * @param uuid 
         * @param target 
         */
        'move-asset' (event: IPCEvent, uuid: string, target: string) {

        },

        /**
         * 删除某个资源
         * @param event 
         * @param uuid 
         */
        'delete-asset' (event: IPCEvent, uuid: string) {
            if (!database) {
                return;
            }
            let asset = database.uuid2asset[uuid];
            existsSync(asset.source) && removeSync(asset.source);
            existsSync(asset.source + '.meta') && removeSync(asset.source + '.meta');
        },
    },

    /**
     * 插件加载的时候执行的逻辑
     * 打开一个新的资源数据库
     */
    async load () {
        
        // 拼接需要使用的地址
        let options = {
            target: join(Editor.Project.path, 'assets'),
            library: join(Editor.Project.path, 'library'),
        };

        // 保证文件夹存在
        ensureDirSync(options.target);
        ensureDirSync(options.library);

        // 启动资源数据库
        try {
            database = new AssetDB(options);
            await database.start();

            // 绑定文件添加事件
            database.on('add', (uuid) => {
                Editor.Ipc.sendToAll('asset-db:asset-add', uuid);
            });

            // 绑定文件删除事件
            database.on('delete', (uuid) => {
                Editor.Ipc.sendToAll('asset-db:asset-delete', uuid);
            });
        } catch (error) {
            console.error(error);
        }

        // 更新主进程标记以及广播消息
        isReady = true;
        Editor.Ipc.sendToAll('asset-db:ready');
    },

    /**
     * 插件关闭的时候执行的逻辑
     * 关闭打开的 AssetDB
     */
    async unload () {
        if (database) {
            // 关闭资源数据库
            await database.stop();
            database = null;
        }

        // 更新主进程标记以及广播消息
        isReady = false;
        Editor.Ipc.sendToAll('asset-db:close');
    },

};