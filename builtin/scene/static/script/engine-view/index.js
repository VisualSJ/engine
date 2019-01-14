'use strict';

const { join } = require('path');
const vDependence = require('v-dependence');
const HostIpc = require('../public/ipc/host');

const initIPC = require('./ipc');
const initListener = require('./listener');
const tasks = require('./tasks');

class View extends window.HTMLElement {
    constructor() {
        super();
        this.dirty = false;
        tasks.$scene = this;

        this.setAttribute('tabindex', '-1');

        this.$scene = document.createElement('webview');
        this.depend = vDependence.create();

        // 如果 webview 被注销了，需要通知
        this.$scene.addEventListener('destroyed', () => {
            this.depend.reset(tasks.webviewReady[0]);
        });

        // 封装的 webview 通讯模块
        this.ipc = new HostIpc(this.$scene);

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

        // 查询 asset-db 是否ready
        if (this.depend.execute(tasks.assetDbReady[0])) {
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
