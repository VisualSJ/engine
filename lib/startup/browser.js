'use strict';

const ps = require('path'); // path system

const ipc = require('@base/electron-base-ipc');

const Package = require('../package');
const Windows = require('../windows');

const array = [
    'preferences', 'engine', 'selection',
    'asset-db', 'console', 'scene', 'assets', 'inspector', 'hierarchy',
    'ui-preview',
];

class Startup {

    constructor () {
        // 总任务数量，窗口 + 插件
        this.total = 1 + array.length;
        this.finish = 0;

        ipc.on('editor.startup:query-process', (event) => {
            event.reply(null, this.finish / this.total);
        });
    }

    /**
     * 恢复窗口的任务
     */
    async window () {
        try {
            Windows.restore();
        } catch (error) {
            console.error(error);
        }
        this.finish += 1;
        this.emit();
    }

    /**
     * 加载必要的内置插件的任务
     */
    async package () {
        for (let i=0; i<array.length; i++) {
            try {
                await Package.load(ps.join(__dirname, `../../builtin/${array[i]}`));
            } catch (error) {
                console.error(error);
            }
            this.finish += 1;
            this.emit();
        }
        Package.watch(); // 加载完必要插件后,启动监听packages文件夹
    }

    /**
     * 向窗口们推送当前编辑器加载的进度
     */
    emit () {
        ipc.broadcast('editor.startup:process', this.finish / this.total);
    }
}

module.exports = new Startup();
