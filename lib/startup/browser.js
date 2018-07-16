'use strict';

const ps = require('path'); // path system

const ipc = require('@base/electron-base-ipc');

const Package = require('../package');
const Windows = require('../windows');

class Startup {

    constructor () {
        // 总任务数量，暂时是手写的
        this.total = 8; // 1 + 7
        this.finish = 0;

        ipc.on('editor.startup:query-process', (event) => {
            event.reply(null, this.finish / this.total);
        });
    }

    /**
     * 恢复窗口
     */
    async window () {
        await Windows.restore();
        this.finish += 1;
        this.emit();
    }

    /**
     * 加载必要的内置插件
     */
    async package () {
        let array = [
            'asset-db', 'console', 'scene', 'assets', 'inspector', 'hierarchy',
            'preferences',
        ];

        for (let i=0; i<array.length; i++) {
            await Package.load(ps.join(__dirname, `../../builtin/${array[i]}`));
            this.finish += 1;
            this.emit();
        }
    }

    /**
     * 向窗口们推送当前编辑器加载的进度
     */
    emit () {
        ipc.broadcast('editor.startup:process', this.finish / this.total);
    }
}

module.exports = new Startup();
