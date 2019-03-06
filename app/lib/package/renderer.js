'use strict';

const { EventEmitter } = require('events');
const { join } = require('path');
const ipc = require('@base/electron-base-ipc');

class PackageManager extends EventEmitter {

    /**
     * 查询插件数组
     * @param {*} options
     */
    getPackages(options) {
        return ipc.sendSync('editor3d-lib-package:call', 'getPackages', options);
    }
}

module.exports = new PackageManager();

// 监听插件启动事件
ipc.on('editor3d-lib-package:emit', (event, name, ...args) => {
    module.exports.emit(name, ...args);
});

// 插件启动的时候，执行插件内注入到窗口代码的 load 代码
module.exports.on('enable', (path, data) => {
    if (data.info.windows) {
        try {
            require(join(data.path, data.info.windows)).load();
        } catch (error) {
            console.error(`Plug-in(${data.info.name}) execution error: [windows].load code failed to execute.`);
            console.error(error);
        }
    }
});

// 插件关闭的时候，执行插件内注入到窗口代码的 unload 代码
module.exports.on('disable', (path, data) => {
    if (data.info.windows) {
        try {
            require(join(data.path, data.info.windows)).unload();
        } catch (error) {
            console.error(`Plug-in(${data.info.name}) execution error: [windows].unload code failed to execute.`);
            console.error(error);
        }
    }
});

const list = module.exports.getPackages({
    enable: true,
});

// HACK: todo remove
setTimeout(() => {
    list.forEach((data) => {
        if (data.info.windows) {
            try {
                require(join(data.path, data.info.windows)).load();
            } catch (error) {
                console.error(`Plug-in(${data.info.name}) execution error: [windows].load code failed to execute.`);
                console.error(error);
            }
        }
    });
}, 200);
