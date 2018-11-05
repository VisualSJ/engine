'use strict';

const { join } = require('path');
const { outputFile } = require('fs-extra');
const HostIpc = require('./ipc/host');

class View extends window.HTMLElement {
    constructor() {
        super();

        this.dirty = false;

        this.$scene = document.createElement('webview');

        // 封装的 webview 通讯模块
        this.ipc = new HostIpc(this.$scene);

        this.uuid = null;
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
     * 打开调试模式
     */
    openDevTools() {
        this.$scene.openDevTools();
    }

    /**
     * 转发操作请求给子进程内的各个 manager
     * @param {*} module manager 名字，以大写开头
     * @param {*} handler manager 上的方法名字
     * @param {*} params 执行方法所用的参数
     */
    forwarding(module, handler, params = []) {
        return await this.ipc.send('call-method', {
            module,
            handler,
            params,
        });
    }

    /**
     * 打开场景
     */
    async openScene(uuid) {
        // 防止加载多次相同的引擎
        if (uuid && this.uuid === uuid) {
            return;
        }
        this.uuid = uuid;
        await this.closeScene();
        const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);

        this.dirty = false;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'open',
            params: [asset ? uuid : null]
        });
    }

    /**
     * 序列化当前打开的场景
     */
    async saveScene() {
        const txt = await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'serialize',
            params: []
        });

        // 如果 uuid 不存在，则是一个新场景
        if (this.uuid) {
            // 如果 uuid 存在，则获取 asset 信息，直接修改对应的文件
            const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.uuid);

            // 如果资源存在，则直接覆盖
            // 但如果资源已经被删除，则应该以新场景的方式处理
            if (asset) {
                let url = asset.source.replace('db:/', Editor.Project.path);
                await outputFile(url, txt);
                console.log(`Save scene: ${asset.source}`);
                return;
            }
        }

        // todo 弹窗
        const source = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', 'db://assets/NewScene.scene', txt);
        this.uuid = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', source);
        const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.uuid);
        this.dirty = false;
        console.log(`Save scene: ${asset.source}`);
    }

    /**
     * 关闭场景
     */
    async closeScene() {
        this.dirty = false;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'close',
            params: []
        });
    }

    ///////////////////

    /**
     * 设置某个属性
     */
    async setProperty(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'setProperty',
            params: [options.uuid, options.path, options.dump]
        });
    }

    ///////////////////

    /**
     * 在数组内插入一个对象
     */
    async insertArrayElement(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'insertArrayElement',
            params: [options.uuid, options.path, options.key, options.index, options.dump]
        });
    }

    /**
     * 在数组内移动一个对象
     */
    async moveArrayElement(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'moveArrayElement',
            params: [options.uuid, options.path, options.target, options.offset]
        });
    }

    /**
     * 在数组内删除一个对象
     */
    async removeArrayElement(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'removeArrayElement',
            params: [options.uuid, options.path, options.index]
        });
    }

    ///////////////////

    /**
     * 重新加载某脚本
     * @param {*} options
     */
    async loadScripts(options) {
        return await this.ipc.send('call-method', {
            module: 'Script',
            handler: 'loadScripts',
            params: [options.uuids]
        });
    }

    ///////////////////

    /**
     * 创建新节点
     */
    async createNode(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'createNode',
            params: [options.parent, options.name, options.dump]
        });
    }

    /**
     * 删除节点
     */
    async removeNode(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'removeNode',
            params: [options.uuid]
        });
    }

    ///////////////////

    /**
     * 新建一个组件
     */
    async createComponent(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'createComponent',
            params: [options.uuid, options.component]
        });
    }

    /**
     * 删除一个组件
     */
    async removeComponent(options) {
        this.dirty = true;
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'removeComponent',
            params: [options.uuid, options.component]
        });
    }

    ///////////////////

    /**
     * 查询 uuid 对应的节点
     * @param uuid
     */
    async queryNode(uuid) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'queryNode',
            params: [uuid]
        });
    }

    /**
     * 查询节点树
     */
    async queryNodeTree() {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'queryNodeTree',
            params: []
        });
    }

    /**
     * 查询一个节点在场景内的搜索路径
     * @param {*} uuid
     */
    async queryNodePath(uuid) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'queryNodePath',
            params: [uuid]
        });
    }

    /**
     * 查询一个节点内挂载的所有组件以及对应的函数
     * @param {*} uuid
     */
    async queryComponentFunctionOfNode(uuid) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'queryComponentFunctionOfNode',
            params: [uuid]
        });
    }

    ///////////////////

    /**
     * 操作记录：重置历史记录
     */
    async resetHistory(uuid) {
        return await this.ipc.send('call-method', {
            module: 'History',
            handler: 'reset',
            params: []
        });
    }

    /**
     * 操作记录：保存受影响的 uuid
     */
    async recordHistory(uuid) {
        return await this.ipc.send('call-method', {
            module: 'History',
            handler: 'record',
            params: [uuid]
        });
    }

    /**
     * 操作记录：正式保存一次操作记录
     */
    async snapshot() {
        return await this.ipc.send('call-method', {
            module: 'History',
            handler: 'snapshot',
            params: []
        });
    }

    /**
     * 操作记录：撤销一步操作
     */
    async undo() {
        return await this.ipc.send('call-method', {
            module: 'History',
            handler: 'undo',
            params: []
        });
    }

    /**
     * 操作记录：重做一步操作
     */
    async redo() {
        return await this.ipc.send('call-method', {
            module: 'History',
            handler: 'redo',
            params: []
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
            compile: elem.info.compile,
        };
    });

    // 查询当前启动的场景信息
    elem.ipc.on('query-scene', () => {
        return elem.uuid;
    });

    // 查询当前 asset 数据库使用的脚本文件
    elem.ipc.on('query-scripts', async () => {
        // 加载项目脚本
        const assets = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        const scripts = assets.map((asset) => {
            if (asset.importer === 'javascript') {
                return asset.uuid;
            }
        }).filter(Boolean);

        return scripts;
    });

    //////////////////////////
    // 转发消息

    // 转发查询 asset 数据消息
    elem.ipc.on('query-asset-info', async (uuid) => {
        return Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    });

    // 转发选中节点消息
    elem.ipc.on('select-nodes', (uuids) => {
        uuids.forEach((uuid) => {
            Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
        });
    });
    elem.ipc.on('unselect-nodes', (uuids) => {
        uuids.forEach((uuid) => {
            Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
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
