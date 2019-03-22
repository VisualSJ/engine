'use stirct';

const { depend, getWorker, waitAsset } = require('./tasks');

// 查询编辑器是否 ready
// @ts-ignore
if (Editor.Startup.ready.package) {
    depend.finish('editor-init');
} else {
    // @ts-ignore
    Editor.Startup.once('package-ready', () => {
        depend.finish('editor-init');
    });
}

/**
 * 初始化 worker 并启动
 */
export async function init() {
    depend.execute('worker-init');
    depend.execute('engine-info');
}

/**
 * 启动数据库
 * @param config
 */
export function startDatabase(config: IAssetDBConfig) {
    // open(config.name);
    // databaseWorker.send('asset-worker:startup-database', config);
}

/**
 * 启动 debug 模式
 */
export function debug() {
    const worker = getWorker();
    worker && worker.debug(true);
}

/**
 * 刷新数据库
 */
export function reload() {
    const worker = getWorker();
    worker && worker.win.reload();
}

/**
 * 转发数据
 * @param message
 * @param args
 */
export async function forwarding(message: string, ...args: any[]): Promise<any> {
    const worker = getWorker();
    if (!worker) {
        return null;
    }
    return await worker.send(message, ...args);
}

export async function awaitAsset(type: string, path: string) {
    await waitAsset(type, path);
}
