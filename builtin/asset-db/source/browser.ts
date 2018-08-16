'use stirct';

import { AssetDB } from 'asset-db';
import { existsSync } from 'fs';
import { ensureDirSync, outputFileSync, removeSync } from 'fs-extra';
import { join, relative } from 'path';

let isReady: boolean = false;
let database: AssetDB | null = null;

interface IAssetInfo {
    source: string;
    uuid: string;
    importer: string; // meta 内存储的导入器名字
    files: string[];
}

const source2url = (source: string) => {
    if (!database) {
        return '';
    }
    return relative(database.options.target, source);
};

module.exports = {
    /**
     * 监听消息
     * ${action}-${method}
     */
    messages: {
        /**
         *  查询是否准备完成
         */
        'query-is-ready'() {
            return isReady;
        },

        /**
         * 查询资源树
         */
        'query-assets'(options: any) {
            if (!database) {
                throw new Error('Asset DB does not exist.');
            }

            // 返回所有的资源的基础数据
            const assets = Object.keys(database.uuid2asset).map((uuid) => {
                if (!database) {
                    return null;
                }
                const asset = database.uuid2asset[uuid];
                const info: IAssetInfo = {
                    source: source2url(asset.source),
                    uuid: asset.uuid,
                    importer: asset.meta.importer,
                    files: asset.meta.files.map((ext) => {
                        return asset.library + ext;
                    })
                };
                return info;
            });

            return assets;
        },

        /**
         * 查询资源信息
         * @param uuid
         */
        'query-asset-info'(uuid: string) {
            if (!database) {
                throw new Error('Asset DB does not exist.');
            }
            const asset = database.uuid2asset[uuid];
            if (!asset) {
                throw new Error('File does not exist.');
            }

            const info: IAssetInfo = {
                source: source2url(asset.source),
                uuid: asset.uuid,
                importer: asset.meta.importer,
                files: asset.meta.files.map((ext) => {
                    return asset.library + ext;
                })
            };
            return info;
        },

        /**
         * 查询资源的 meta 信息
         * @param uuid
         */
        'query-asset-meta'(uuid: string) {
            if (!database) {
                throw new Error('Asset DB does not exist.');
            }
            const asset = database.uuid2asset[uuid];
            if (!asset) {
                throw new Error('File does not exist.');
            }
            return asset.meta;
        },

        /**
         * 创建一个新的资源
         * @param url db://assets/abc.json
         * @param data
         */
        'create-asset'(url: string, data: Buffer | string) {
            if (!database) {
                return false;
            }

            if (!url.startsWith('db://assets')) {
                // todo info
                return false;
            }

            url = url.substr(12);

            // 文件目录路径
            const dirname = database.options.target;
            const file = join(dirname, url);

            if (existsSync(file)) {
                // todo info
                return false;
            }

            outputFileSync(file, data);
            return true;
        },

        /**
         * 将一个资源移动到某个地方
         * 更名操作也可以调用 move
         * @param uuid
         * @param target
         */
        'move-asset'(uuid: string, target: string) {},

        /**
         * 删除某个资源
         * @param uuid
         */
        'delete-asset'(uuid: string) {
            if (!database) {
                return false;
            }
            const asset = database.uuid2asset[uuid];
            existsSync(asset.source) && removeSync(asset.source);
            existsSync(asset.source + '.meta') && removeSync(asset.source + '.meta');
            return true;
        }
    },

    /**
     * 插件加载的时候执行的逻辑
     * 打开一个新的资源数据库
     */
    async load() {
        // 拼接需要使用的地址
        const options = {
            target: join(Editor.Project.path, 'assets'),
            library: join(Editor.Project.path, 'library')
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
    async unload() {
        if (database) {
            // 关闭资源数据库
            await database.stop();
            database = null;
        }

        // 更新主进程标记以及广播消息
        isReady = false;
        Editor.Ipc.sendToAll('asset-db:close');
    }
};
