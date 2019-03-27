'use strict';

import { join } from 'path';

const profile = Editor.Profile.load('profile://global/packages/asset-db.json');

const windows = require('@base/electron-windows');
const worker = require('@base/electron-worker');
const vDependence = require('v-dependence');

let ready = false;

const awaitHandler: { [key: string]: { [key: string]: Array<() => any> } } = {
    add: {},
    change: {},
    delete: {},
};

export const depend = vDependence.create();

export function getWorker() {
    return databaseWorker;
}

export function isReady() {
    return ready;
}

export async function waitAsset(type: string, path: string) {
    return new Promise((resolve) => {
        awaitHandler[type][path] = awaitHandler[type][path] || [];
        awaitHandler[type][path].push(resolve);
    });
}

let databaseWorker: any = null;
let engineInfo: IEngineInfo;

// 程序丢失焦点的时候暂停数据库的导入任务
windows.on('blur', () => {
    databaseWorker && databaseWorker.send('asset-worker:pause-all-database');
});

// 程序获得焦点的时候，启动任务对列内暂存的所有任务
windows.on('focus', () => {
    databaseWorker && databaseWorker.send('asset-worker:resume-all-database');
});

/**
 * 启动一个资源数据库
 * @param config 
 */
async function startDatabase(config: IAssetDBConfig) {

    if (!config.name || !config.target) {
        return;
    }

    Editor.Task.addSyncTask('import-asset', Editor.I18n.t('asset-db.mask.startup', config.name));

    config.temp = join(Editor.Project.path, 'temp/asset-db', config.name);
    config.library = join(Editor.Project.path, 'library');
    config.interval = 500;
    config.binaryInterval = 1000;
    config.usePolling = false;
    // config.useFsEvents = true;
    // config.ignored = '*.meta';
    config.alwaysStat = true;
    config.followSymlinks = false;


    if (typeof config.visible !== 'boolean') {
        config.visible = true;
    }
    if (typeof config.readOnly !== 'boolean') {
        config.readOnly = false;
    }

    config.level = profile.get('log.level');
    if (typeof config.level !== 'number' || config.level <= 0 || config.level > 4) {
        config.level = 3;
    }

    await databaseWorker.send('asset-worker:startup-database', config);
}

// 编辑器是否启动完毕，这里监听的是 package 的启动
depend.add('editor-init', {
    depends: [],
    async handle() {},
    async reset() {},
});

// 查询引擎数据
depend.add('engine-info', {
    depends: [],
    async handle() {
        engineInfo = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
        depend.finish('engine-info');
    },
    async reset() {},
});

// 运行 db 的 worker 是否启动完成
depend.add('worker-init', {
    depends: [],
    async handle() {
        // 初始化 worker 并且加载指定的文件
        const child = worker.create('asset-db');
        await child.init();
        child.require(join(__dirname, '../../worker'));

        // 如果 worker 被刷新
        child.on('refresh', () => {
            depend.reset('worker-init');
        });
    
        // 如果 worker 被关闭
        child.on('closed', () => {
            depend.reset('worker-init');
        });

        // 某个 db 加载完毕
        child.on('asset-worker:ready', async (event: any, name: string) => {
            Editor.Ipc.sendToAll('asset-db:db-ready', name);
        });

        // 某个 db 被关闭
        child.on('asset-worker:close', async (event: any, name: string) => {
            Editor.Ipc.sendToAll('asset-db:db-close', name);
        });

        // workder 检测到了插入资源
        child.on('asset-worker:asset-add', (event: any, uuid: string, path: string) => {
            Editor.Task.addSyncTask('import-asset', Editor.I18n.t('asset-db.mask.loading'), path);
            if (awaitHandler.add[path]) {
                awaitHandler.add[path].forEach((item) => {
                    item();
                });
                delete awaitHandler.add[path];
            }
            if (ready) {
                Editor.Ipc.sendToAll('asset-db:asset-add', uuid);
            }
        });

        // worker 检测到了修改资源
        child.on('asset-worker:asset-change', (event: any, uuid: string, path: string) => {
            if (awaitHandler.change[path]) {
                awaitHandler.change[path].forEach((item) => {
                    item();
                });
                delete awaitHandler.change[path];
            }
            if (ready) {
                Editor.Ipc.sendToAll('asset-db:asset-change', uuid);
            }
        });

        // worker 检测到了删除资源
        child.on('asset-worker:asset-delete', (event: any, uuid: string, path: string, info: any) => {
            if (awaitHandler.delete[path]) {
                awaitHandler.delete[path].forEach((item) => {
                    item();
                });
                delete awaitHandler.delete[path];
            }
            if (ready) {
                Editor.Ipc.sendToAll('asset-db:asset-delete', uuid, info);
            }
        });

        // 启动 worker 后的初始化操作
        child.on('asset-worker:startup', () => {
            databaseWorker = child;
            depend.finish('worker-init');
        });
    },
    async reset() {
        databaseWorker = null;
    },
});

// 初始化 worker 内的 engine
depend.add('worker-engine', {
    depends: ['engine-info', 'worker-init'],
    async handle() {
        await databaseWorker.send('asset-worker:init', {
            engine: engineInfo.path,
            type: Editor.Project.type,
            dist: join(__dirname, '../../../dist'),
            utils: engineInfo.utils,
        });
        depend.finish('worker-engine');
    },
    async reset() {},
});

// 启动内置的资源数据库
depend.add('builtin-db-startup', {
    depends: ['engine-info', 'worker-init'],
    async handle() {
        // @ts-ignore
        await startDatabase({
            name: 'internal',
            target: join(__dirname, '../../../static/internal/assets'),
            readOnly: !Editor.dev,
        });
        // @ts-ignore
        await startDatabase({
            name: 'assets',
            target: join(Editor.Project.path, 'assets'),
        });
        depend.finish('builtin-db-startup');
    },
    async reset() {}
});

// 启动插件注册的数据库
depend.add('package-db-startup', {
    depends: ['editor-init', 'builtin-db-startup'],
    async handle() {
        const packages = Editor.Package.getPackages();
        const list: any[] = [];
        packages.forEach((data: any) => {
            const config = data.info['runtime-resource'];
            if (!config) {
                return;
            }
            config.name = data.name;
            config.target = join(data.path, config.target);
            list.push(config);
        });

        for (let i = 0; i < list.length; i++) {
            await startDatabase(list[i]);
        }
        depend.finish('package-db-startup');
    },
    async reset() {},
});

// DB 插件是否准备就绪
depend.add('asset-db-ready', {
    depends: [
        'package-db-startup',
    ],
    async handle() {
        ready = true;
        Editor.Ipc.sendToAll('asset-db:ready');
    },
    async reset() {
        ready = false;
        Editor.Ipc.sendToAll('asset-db:close');
    },
});