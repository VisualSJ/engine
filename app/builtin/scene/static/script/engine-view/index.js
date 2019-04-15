'use strict';

const { join } = require('path');
const vDependence = require('v-dependence');
const HostIpc = require('../public/ipc/host');

const initIPC = require('./ipc');
const initListener = require('./listener');
const tasks = require('./tasks');
const template = require('art-template');
const { readFileSync } = require('fs');
class View extends window.HTMLElement {
    constructor() {
        super();
        this.dirty = false;
        tasks.$scene = this;

        this.setAttribute('tabindex', '-1');

        this.$scene = document.createElement('webview');
        this.depend = vDependence.create();

        this.$minWindow = document.createElement('div');
        this.$toolbar = document.createElement('div');

        // 如果 webview 被注销了，需要通知
        this.$scene.addEventListener('destroyed', () => {
            this.depend.reset(tasks.webviewReady[0]);
        });

        // 封装的 webview 通讯模块
        this.ipc = new HostIpc(this.$scene);

        this.depend.add(...tasks.editorInit);
        this.depend.add(...tasks.assetDbReady);
        this.depend.add(...tasks.queryEngineInfo);
        this.depend.add(...tasks.webviewReady);
        this.depend.add(...tasks.webviewEngineInit);
        this.depend.add(...tasks.webviewManagerInit);
        this.depend.add(...tasks.webviewIpcReady);
        this.depend.add(...tasks.autoOpenScene);

        // 当前打开的引擎版本
        this.version = null;
    }

    /**
     * 初始化
     */
    async init() {
        // 根据项目类型初始化 webview
        let preload = join(__dirname, `../${Editor.Project.type}/preload.js`);
        this.$scene.setAttribute('nodeintegration', '');
        this.$scene.setAttribute('preload', `file://${preload}`);
        this.$scene.setAttribute('disablewebsecurity', '');
        this.$scene.setAttribute('style', 'pointer-events: none;');
        this.$scene.setAttribute('src', `packages://scene/static/template/${Editor.Project.type}-webview.html`);
        this.appendChild(this.$scene);

        this.$minWindow.setAttribute('id', 'MinWindow');
        this.appendChild(this.$minWindow);
        this.$minWindow.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });
        this.$minWindow.addEventListener('mousewheel', (event) => {
            event.stopPropagation();
        });

        // 场景上的操作按钮
        this.initToolbar();

        // 查询编辑器是否 ready
        if (Editor.Startup.ready.package) {
            this.depend.finish(tasks.editorInit[0]);
        } else {
            Editor.Startup.once('package-ready', () => {
                this.depend.finish(tasks.editorInit[0]);
            });
        }

        // 查询 asset-db 是否 ready
        if (await this.depend.execute(tasks.assetDbReady[0])) {
            this.depend.finish(tasks.assetDbReady[0]);
        }

        // 查询引擎数据, 并指定 webview 加载
        this.info = await this.depend.execute(tasks.queryEngineInfo[0]);
        this.version = this.info.version;
        this.depend.finish(tasks.queryEngineInfo[0]);

        // 初始化 ipc 监听
        initIPC(this);

        // 初始化键盘监听事件
        initListener(this);

        // 等待 webview 初始化完成
        await new Promise((resolve) => {
            this.$scene.addEventListener('dom-ready', () => {
                resolve();
            });
        });
    }

    /**
     * 转发操作请求给子进程内的各个 manager
     * @param {*} module manager 名字，以大写开头
     * @param {*} handler manager 上的方法名字
     * @param {*} params 执行方法所用的参数
     */
    async forwarding(module, handler, params = []) {
        tasks.updateDump();
        return await this.ipc.send('call-method', {
            module,
            handler,
            params,
        });
    }

    /**
     * 强制发送，不等待队列
     * @param {*} module
     * @param {*} handler
     * @param {*} params
     */
    async forceForwarding(module, handler, params = []) {
        return await this.ipc.forceSend('call-method', {
            module,
            handler,
            params,
        });
    }

    /**
     * 显示小窗口
     * @param {*} info
     */
    showMinWindow(info) {
        if (info.name === 'preview') {
            // 显示预览窗口

        } else {
            const path = join(__dirname, `./../../template/min-window/${info.name}.html`);
            const content = template.render(readFileSync(path, 'utf-8'), info);
            this.$minWindow.innerHTML = content;
        }
    }

    // 隐藏小窗口
    hideMinWindow() {
        this.$minWindow.innerHTML = '';
    }

    /**
     * 初始化工具条
     */
    initToolbar() {
        const toolbar = join(__dirname, `./../../template/toolbar.html`);
        this.$toolbar.innerHTML = readFileSync(toolbar, 'utf-8');
        this.$toolbar.setAttribute('id', 'toolbar');
        this.appendChild(this.$toolbar);

        this.$toolbar.querySelector('#save_prefab').addEventListener('click', async () => {
            await this.forwarding('Scene', 'save');
        });

        this.$toolbar.querySelector('#close_prefab').addEventListener('click', async () => {
            await this.forwarding('Scene', 'close');
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
            params: [options.uuid, options.index, ...options.methodNames],
        });
    }
}

module.exports = View;
