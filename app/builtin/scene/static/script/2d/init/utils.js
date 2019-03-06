'use stirct';

const ipc = require('../../public/ipc/webview');

/**
 * 初始化一些工具函数
 * @param {*} path
 */
module.exports = function(path) {
    // 序列化
    Manager._serialize = function() {
        return require(path + '/serialize');
    };

    const backup = {
        warn: console.warn.bind(console),
        error: console.error.bind(console),
    };

    console.warn = function(...args) {
        backup.warn(...args);
        ipc.send('console', 'warn', ...args);
    };
    console.error = function(...args) {
        backup.error(...args);
        ipc.send('console', 'error', ...args);
    };
};
