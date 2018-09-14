'use strict';

const { join } = require('path');
const { outputFile } = require('fs-extra');
const HostIpc = require('./ipc/host');

class View extends window.HTMLElement {

    constructor() {
        super();

        this.info = {};
        this.$scene = document.createElement('webview');

        // 封装的 webview 通讯模块
        this.ipc = new HostIpc(this.$scene);

        // 查询 asset 数据
        this.ipc.on('query-asset-info', async (uuid) => {
            return Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        });

        this.uuid = '';
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
        const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);

        this.version = info.version;

        // 载入指定页面
        this.$scene.loadURL(`packages://scene/static/template/${Editor.Project.type}-webview.html`);

        // 打开调试工具
        // this.$scene.openDevTools();

        // 等待页面载入成功
        await new Promise((resolve) => {
            this.$scene.addEventListener('dom-ready', () => {
                requestAnimationFrame(resolve);
            });
        });


        // 设置当前的引擎
        await this.ipc.send('init-engine', info).promise();
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

        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'open',
            params: [asset ? uuid : null],
        }).promise();
    }

    /**
     * 序列化当前打开的场景
     */
    async saveScene() {
        const txt = await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'serialize',
            params: [],
        }).promise();

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
        console.log(`Save scene: ${asset.source}`);
    }

    /**
     * 关闭场景
     */
    async closeScene() {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'close',
            params: [],
        }).promise();
    }

    ///////////////////

    /**
     * 设置某个属性
     */
    async setProperty(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'setProperty',
            params: [options.uuid, options.path, options.key, options.dump],
        }).promise();
    }

    ///////////////////

    /**
     * 在数组内插入一个对象
     */
    async insertArrayElement(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'insertArrayElement',
            params: [options.uuid, options.path, options.key, options.index, options.dump],
        }).promise();
    }

    /**
     * 在数组内移动一个对象
     */
    async moveArrayElement(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'moveArrayElement',
            params: [options.uuid, options.path, options.key, options.target, options.offset],
        }).promise();
    }

    /**
     * 在数组内删除一个对象
     */
    async removeArrayElement(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'removeArrayElement',
            params: [options.uuid, options.path, options.key, options.index],
        }).promise();
    }

    ///////////////////

    /**
     * 创建新节点
     */
    async createNode(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'createNode',
            params: [options.parent, options.name],
        }).promise();
    }

    /**
     * 删除节点
     */
    async removeNode(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'removeNode',
            params: [options.uuid],
        }).promise();
    }

    ///////////////////

    /**
     * 新建一个组件
     */
    async createComponent(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'createComponent',
            params: [options.uuid, options.component],
        }).promise();
    }

    /**
     * 删除一个组件
     */
    async removeComponent(options) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'removeComponent',
            params: [options.uuid, options.component],
        }).promise();
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
            params: [uuid],
        }).promise();
    }

    /**
     * 查询节点树
     */
    async queryNodeTree() {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'queryNodeTree',
            params: [],
        }).promise();
    }

    /**
     * 查询一个节点在场景内的搜索路径
     * @param {*} uuid 
     */
    async queryNodePath(uuid) {
        return await this.ipc.send('call-method', {
            module: 'Scene',
            handler: 'queryNodePath',
            params: [uuid],
        }).promise();
    }
}

module.exports = View;