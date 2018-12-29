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
    'tester',
];

class Startup {
    constructor() {
        // 总任务数量，窗口 + 插件
        this.total = 0;
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
    }

    /**
     * 加载必要的内置插件的任务
     */
    async package() {
        // 注册内置插件
        for (let i = 0; i < array.length; i++) {
            try {
                const path = ps.join(__dirname, `../../builtin/${array[i]}`);
                Package.register(path);
            } catch (error) {
                console.error(error);
            }
        }

        // 扫描全局和本地插件
        Package.scan(ps.join(Editor.App.home, 'packages'));
        Package.scan(ps.join(Editor.Project.path, 'packages'));

        const list = Package.getPackages({
            autoEnable: true,
        });

        this.total = list.length;

        for (let i = 0; i < list.length; i++) {
            let data = list[i];
            this.changeMessage(`Loading ${data.info.name}`);
            await Package.enable(data.path);
            this.finish += 1;
            this.emit();
        }
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
