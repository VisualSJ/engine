'use strict';

const { join } = require('path');
const HostIpc = require('./ipc/host');

const profile = Editor.Profile.load('profile://local/packages/scene.json');

class View extends window.HTMLElement {
    constructor() {
        super();

        this.dirty = false;

        this.$scene = document.createElement('webview');

        // 封装的 webview 通讯模块
        this.ipc = new HostIpc(this.$scene);

        // 当前打开的引擎版本
        this.version = null;
    }

    /**
     * 初始化
     */
    async init() {
        // 根据项目类型初始化 webview
        let preload = join(__dirname, `./${Editor.Project.type}/preload.js`);
        this.$scene.setAttribute('nodeintegration', '');
        this.$scene.setAttribute('preload', `file://${preload}`);
        this.$scene.setAttribute('disablewebsecurity', '');
        this.appendChild(this.$scene);

        // 查询引擎数据, 并指定 webview 加载
        this.info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
        this.version = this.info.version;

        // 初始化 ipc 监听
        initIpc(this);

        // 载入指定页面
        this.$scene.loadURL(`packages://scene/static/template/${Editor.Project.type}-webview.html`);
    }

    /**
     * 转发操作请求给子进程内的各个 manager
     * @param {*} module manager 名字，以大写开头
     * @param {*} handler manager 上的方法名字
     * @param {*} params 执行方法所用的参数
     */
    async forwarding(module, handler, params = []) {
        return await this.ipc.send('call-method', {
            module,
            handler,
            params
        });
    }

    ///////////////////

    /**
     * 执行组件方法
     */
    async excuteComponentMethod(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'excuteComponentMethod',
            params: [
                options.uuid,
                options.index,
                ...options.methodNames
            ]
        });
    }
}

module.exports = View;

//////////////////////
// 私有方法

/**
 * 初始化 ipc 消息
 */
async function initIpc(elem) {
    /////////////////////////
    // 查询消息

    // 查询当前的数据信息（webview）刷新的时候，需要数据重置自身状态
    elem.ipc.on('query-engine', () => {
        return {
            path: elem.info.path,
            utils: elem.info.utils,
            compile: elem.info.compile
        };
    });

    // 查询当前启动的场景信息
    elem.ipc.on('query-scene', () => {
        const uuid = profile.get('current-scene') || '';
        return uuid;
    });

    // 查询当前 asset 数据库使用的脚本文件
    elem.ipc.on('query-scripts', async () => {
        // 加载项目脚本
        const assets = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        const scripts = assets
            .map((asset) => {
                if (asset.importer === 'javascript') {
                    return asset.uuid;
                }
            })
            .filter(Boolean);

        return scripts;
    });

    //////////////////////////
    // 转发消息

    // 转发查询 asset 数据消息
    elem.ipc.on('query-asset-info', async (uuid) => {
        return await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    });

    // 转发选中节点消息
    elem.ipc.on('select-nodes', (uuids) => {
        uuids.forEach((uuid) => {
            Editor.Ipc.sendToPackage(
                'selection',
                'select',
                'node',
                uuid
            );
        });
    });
    elem.ipc.on('unselect-nodes', (uuids) => {
        uuids.forEach((uuid) => {
            Editor.Ipc.sendToPackage(
                'selection',
                'unselect',
                'node',
                uuid
            );
        });
    });

    // 转发广播消息
    elem.ipc.on('broadcast', (...args) => {
        Editor.Ipc.sendToAll(...args);
    });

    // 转发控制台信息
    elem.ipc.on('console', (type, ...args) => {
        console[type](...args);
    });
}
