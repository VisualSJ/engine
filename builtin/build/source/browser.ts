'use strict';

let pkg: any = null;
const {join} = require('path');
const profile = Editor.Profile.load('profile://global/packages/builder.json');
const ipc = require('@base/electron-base-ipc');
const worker = require('@base/electron-worker');
let buildWorker: any = null;
/**
 * 打开 build 面板
 */
export const messages = {
    open() {
        Editor.Panel.open('build');
    },

    /********************** 查询构建设置信息 *******************/
    /**
     * 查询记录的构建设置信息
     * @param {string} key
     */
    'get-builder-setting'(key: string) {
        return profile.get(key);
    },

    /**
     * 设置构建项目设置
     * @param {string} key
     */
    'set-builder-setting'(key: string, value: any) {
        profile.set(key, value);
    },

    // 保存构建设置信息
    'save-builder-setting'() {
        profile.save();
    },

    /**
     * 切换调试模式
     */
    'open-devtools'() {
        buildWorker.debug(true);
    },

// ******************** 获取构建相关脚本的处理方法 ********************/

    /**
     * 项目构建
     * @param {object} options
     */
    build(options: object) {
        buildWorker.send('build-worker:build', options);
    },

    /**
     * 构建 setting 脚本
     * @param {object} options
     */
    async 'build-setting'(options: object, config: object) {
        return await buildWorker.send('build-worker:build-setting', options, config);
    },

    /**
     * 将脚本处理为 web 端可用的格式
     * @param {string} path
     */
    async 'get-modules'(path: string) {
        return await buildWorker.send('build-worker:get-modules', path);
    },

    /**
     * 获取当前场景信息，若有传入 uuid 则查询该 uuid 的场景 asset 数据
     * @param {string} uuid
     * @returns {object} asset
     */
    async 'get-current-scene'(uuid: string) {
        return await buildWorker.send('build-worker:get-current-scene', uuid);
    },
};

export async function load() {
    // @ts-ignore
    pkg = this;
    await createWorker();
    ipc.on('editor.startup:process', (event: any, progress: any) => {
        if (progress === 1) {
            Editor.Ipc.sendToPanel('build', 'refresh');
        }
    });
}

export function unload() {

}

/**
 * 创建 builder 的 worker 并且初始化
 */
async function createWorker() {
    // 查询引擎数据, 并指定 worker 加载
    const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    buildWorker = worker.create('build-worker');
    await buildWorker.init();
    buildWorker.require(join(__dirname, './../static/scripts/build-worker'));

    // 是否打开调试模式
    buildWorker.debug(false);

    // 启动 worker 后的初始化操作
    buildWorker.on('build-worker:startup', () => {
        // 初始化自进程
        buildWorker.send('build-worker:init', {
            engine: info.path,
            type: Editor.Project.type,
            utils: info.utils,
            version: info.version,
            project: Editor.Project.path,
            app: Editor.App.path,
        });

    });

    // worker 与其他插件的通信转发
    buildWorker.on('build-worker:request-package', async (event: any, ...args: any[]) => {
         const data = await Editor.Ipc.requestToPackage(...args);
         event.reply(null, data);
    });

    // worker 与其他插件的通信转发
    buildWorker.on('build-worker:update-progress', async (event: any, ...args: any[]) => {
        Editor.Ipc.sendToAll('build:update-progress', ...args);
    });
}
