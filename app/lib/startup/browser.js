'use strict';

const ps = require('path'); // path system
const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');

const Package = require('../package');
const Windows = require('../windows');
const Task = require('../task');
const I18n = require('../i18n');

const array = [
    'preferences',
    'engine',
    'highlighter',
    'asset-db',
    'console',
    'scene',
    'assets',
    'inspector',
    'hierarchy',
    'ui-preview',
    'packager',
    'project-setting',
    'preview',
    'build',
    'animator',
    'tester',
];

class Startup extends EventEmitter {

    constructor() {
        super();
        this.ready = {
            window: false,
            package: false,
        };
    }

    /**
     * 恢复窗口的任务
     */
    async window() {
        try {
            await Windows.restore();
        } catch (error) {
            console.error(error);
        } finally {
            this.ready.window = true;
            this.emit('window-ready');
            ipc.broadcast('editor3d-lib-startup:emit', 'window');
        }
    }

    /**
     * 加载必要的内置插件的任务
     */
    async package() {
        try {
            // 注册内置插件
            for (let i = 0; i < array.length; i++) {
                try {
                    Task.addSyncTask(`startup.${array[i]}`, I18n.t('startup.load_package', array[i]));
                    const path = ps.join(__dirname, `../../builtin/${array[i]}`);
                    await Package.register(path);
                    await Package.enable(path);
                    Task.removeSyncTask(`startup.${array[i]}`);
                } catch (error) {
                    console.error(error);
                }
            }

            // 扫描全局和本地插件
            await Package.registerDir(ps.join(Editor.App.home, 'packages'));
            await Package.registerDir(ps.join(Editor.Project.path, 'packages'));
        } catch (error) {
            console.error(error);
        } finally {
            this.ready.package = true;
            this.emit('package-ready');
            ipc.broadcast('editor3d-lib-startup:emit', 'package');
        }
    }
}

module.exports = new Startup();

// 页面进程调用主进程的方法
ipc.on('editor3d-lib-startup:ready', (event, name) => {
    return module.exports.ready[name];
});
