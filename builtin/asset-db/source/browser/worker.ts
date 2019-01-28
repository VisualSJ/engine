'use stirct';

import { join } from 'path';

const worker = require('@base/electron-worker');

const awaitHandler: { [key: string]: { [key: string]: Array<() => any> } } = {
    add: {},
    change: {},
    delete: {},
};

import { close, open, ready, setReady } from './state';
let databaseWorker: any = null;

function startup(info: IEngineInfo) {
    // 初始化子进程内的引擎
    databaseWorker.send('asset-worker:init', {
        engine: info.path,
        type: Editor.Project.type,
        dist: join(__dirname, '../../dist'),
        utils: info.utils,
    });

    // 如果 worker 被刷新
    databaseWorker.on('refresh', () => {
        setReady(false);
    });

    // 如果 worker 被关闭
    databaseWorker.on('closed', () => {
        setReady(false);
    });

    // 某个 db 加载完毕
    databaseWorker.on('asset-worker:ready', async (event: any, name: string) => {
        Editor.Ipc.sendToAll('asset-db:db-ready', name);
        ready(name);
    });

    // 某个 db 被关闭
    databaseWorker.on('asset-worker:close', async (event: any, name: string) => {
        Editor.Ipc.sendToAll('asset-db:db-close', name);
        close(name);
    });

    // workder 检测到了插入资源
    databaseWorker.on('asset-worker:asset-add', (event: any, uuid: string, path: string) => {
        if (awaitHandler.add[path]) {
            awaitHandler.add[path].forEach((item) => {
                item();
            });
            delete awaitHandler.add[path];
        }
        Editor.Ipc.sendToAll('asset-db:asset-add', uuid);
    });

    // worker 检测到了修改资源
    databaseWorker.on('asset-worker:asset-change', (event: any, uuid: string, path: string) => {
        if (awaitHandler.change[path]) {
            awaitHandler.change[path].forEach((item) => {
                item();
            });
            delete awaitHandler.change[path];
        }
        Editor.Ipc.sendToAll('asset-db:asset-change', uuid);
    });

    // worker 检测到了删除资源
    databaseWorker.on('asset-worker:asset-delete', (event: any, uuid: string, path: string) => {
        if (awaitHandler.delete[path]) {
            awaitHandler.delete[path].forEach((item) => {
                item();
            });
            delete awaitHandler.delete[path];
        }
        Editor.Ipc.sendToAll('asset-db:asset-delete', uuid);
    });

    // 编辑器内置的两个数据库
    const list = [{
        name: 'internal',
        target: join(__dirname, '../../static/internal/assets'),
    }, {
        name: 'assets',
        target: join(Editor.Project.path, 'assets'),
    }];

    Editor.Package.getPackages({
        autoEnable: true,
    }).forEach((item: any) => {
        const data = item.info['runtime-resource'];
        if (!data) {
            return;
        }
        list.push({
            name: data.name,
            target: data.path,
        });
    });

    // 启动插件注册的数据库
    list.forEach((config: any) => {
        open(config.name);
        startDatabase({
            // 数据库配置
            name: config.name,
            target: config.target,

            // 固定配置
            temp: join(Editor.Project.path, 'temp/asset-db', config.name),
            library: join(Editor.Project.path, 'library'),

            // 用户可覆盖配置
            visible: true,
            readOnly: false,
        });
    });
}

/**
 * 初始化 worker 并启动
 */
export async function init() {
    // 查询引擎数据, 并指定 worker 加载
    const info: IEngineInfo = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);

    // 初始化 worker 并且加载指定的文件
    databaseWorker = worker.create('asset-db');
    await databaseWorker.init();
    databaseWorker.require(join(__dirname, '../worker'));

    // 启动 worker 后的初始化操作
    databaseWorker.on('asset-worker:startup', () => {
        startup(info);
    });
}

/**
 * 启动数据库
 * @param config
 */
export function startDatabase(config: IAssetDBConfig) {
    open(config.name);
    databaseWorker.send('asset-worker:startup-database', config);
}

/**
 * 启动 debug 模式
 */
export function debug() {
    databaseWorker.debug(true);
}

/**
 * 刷新数据库
 */
export function reload() {
    databaseWorker.win.reload();
}

/**
 * 转发数据
 * @param message
 * @param args
 */
export async function forwarding(message: string, ...args: any[]): Promise<any> {
    return await databaseWorker.send(message, ...args);
}

export async function awaitAsset(type: string, path: string) {
    return new Promise((resolve) => {
        awaitHandler[type][path] = awaitHandler[type][path] || [];
        awaitHandler[type][path].push(resolve);
    });
}
