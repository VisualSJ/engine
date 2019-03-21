'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');
const packageManager = require('@editor/package');

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

////////////////
// 转发时间消息 //

// 注册 package 的时候输出日志
packageManager.on('register', (data) => {
    module.exports.emit('register', data);
});

// 反注册 package 的时候输出日志
packageManager.on('unregister', (data) => {
    module.exports.emit('unregister', data);
});

// 插件启动的时候，执行插件内注入到窗口代码的 load 代码
packageManager.on('enable', (data) => {
    module.exports.emit('enable', data);
});

// 插件关闭的时候，执行插件内注入到窗口代码的 unload 代码
packageManager.on('disable', (data) => {
    module.exports.emit('disable', data);
});
