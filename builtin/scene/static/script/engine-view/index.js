'use strict';

const { join } = require('path');
const HostIpc = require('../public/ipc/host');

const initIPC = require('./ipc');
const initListener = require('./listener');

class View extends window.HTMLElement {
    constructor() {
        super();

        this.setAttribute('tabindex', '-1');

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
        let preload = join(__dirname, `../${Editor.Project.type}/preload.js`);
        this.$scene.setAttribute('nodeintegration', '');
        this.$scene.setAttribute('preload', `file://${preload}`);
        this.$scene.setAttribute('disablewebsecurity', '');
        this.$scene.setAttribute('style', 'pointer-events: none;');
        this.appendChild(this.$scene);

        // 查询引擎数据, 并指定 webview 加载
        this.info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
        this.version = this.info.version;

        // 初始化 ipc 监听
        initIPC(this);

        // 初始化键盘监听事件
        initListener(this);

        // 载入指定页面
        this.$scene.loadURL(`packages://scene/static/template/${Editor.Project.type}-webview.html`);

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
                ...options.methodNames,
            ],
        });
    }
}

module.exports = View;
