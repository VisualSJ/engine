'use strict';

const ipc = require('../../public/ipc/webview');

// host 调用 scene 的指定方法
ipc.on('call-method', async (options) => {
    const mod = Manager[options.module];
    if (!mod) {
        throw new Error(`Module [${options.module}] does not exist.`);
    }
    if (!mod[options.handler]) {
        throw new Error(`Method [${options.handler}] does not exist.`);
    }
    return await mod[options.handler](...options.params);
});

module.exports = ipc;
