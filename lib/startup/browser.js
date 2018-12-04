'use strict';

const ps = require('path'); // path system

const ipc = require('@base/electron-base-ipc');

const Package = require('../package');
const Windows = require('../windows');

const array = [
    'preferences',
    'engine',
    'selection',
    'highlighter',
    'asset-db',
    'console',
    'scene',
    'assets',
    'inspector',
    'hierarchy',
    'ui-preview',
    'package-manager',
    'project-setting',
    'preview',
    'build',
];

class Startup {
    constructor() {
        // 总任务数量，窗口 + 插件
        this.total = 1 + array.length;
        this.finish = 0;

        ipc.on('editor.startup:query-process', (event) => {
            event.reply(null, this.finish / this.total, this.message);
        });
    }

    /**
     * 恢复窗口的任务
     */
    async window() {
        try {
            Windows.restore();
        } catch (error) {
            console.error(error);
        }
        this.finish += 1;
        this.changeMessage('Starting window');
        this.emit();
    }

    /**
     * 加载必要的内置插件的任务
     */
    async package() {
        for (let i = 0; i < array.length; i++) {
            this.changeMessage(`Loading ${array[i]}`);

            try {
                const path = ps.join(__dirname, `../../builtin/${array[i]}`);
                await Package.register(path);
                await Package.enable(path);
            } catch (error) {
                console.error(error);
            }
            this.finish += 1;
            this.emit();
        }

        // 扫描到的插件会和 package 管理器内的数据比对，查询是否需要自动启动
        Package.scan(ps.join(Editor.App.home, 'packages'));
        Package.scan(ps.join(Editor.Project.path, 'packages'));
    }

    changeMessage(message) {
        this.message = message;
        ipc.broadcast('editor.startup:message', this.message);
    }

    /**
     * 向窗口们推送当前编辑器加载的进度
     */
    emit() {
        ipc.broadcast('editor.startup:process', this.finish / this.total);
    }
}

module.exports = new Startup();
