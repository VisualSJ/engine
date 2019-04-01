'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');

class Startup extends EventEmitter {

    constructor() {
        super();

        this.ready = {
            window: ipc.sendSync('editor3d-lib-startup:ready', 'window'),
            package: ipc.sendSync('editor3d-lib-startup:ready', 'package'),
        }
    }
}

module.exports = new Startup();

// 监听插件启动事件
ipc.on('editor3d-lib-startup:emit', (event, name) => {
    module.exports.ready[name] = true;
    module.exports.emit(name + '-ready');
});