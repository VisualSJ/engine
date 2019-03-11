'use strict';

const ps = require('path'); // path system

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
    'package-manager',
    'project-setting',
    'preview',
    'build',
    'tester',
];

class Startup {

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

        for (let i = 0; i < list.length; i++) {
            let data = list[i];
            Task.addSyncTask(data.info.name, I18n.t('startup.load_package', data.info.name));
        }

        for (let i = 0; i < list.length; i++) {
            let data = list[i];
            await Package.enable(data.path);
            Task.removeSyncTask(data.info.name);
        }
    }
}

module.exports = new Startup();
