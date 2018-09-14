'use strict';

const ipc = require('../ipc/webview');

// 放到全局, 便于调试
// 不能放到主页面内, 应该避免主页内的全局参数污染
window.Manager = {
    Ipc: ipc,
    Scene: require('./manager/scene'),
};

// 初始化指定版本的引擎, 成功后通知 host
ipc.on('init-engine', async (info) => {
    const file = info.path;

    const script = document.createElement('script');
    script.src = `file://${file}`;
    document.body.appendChild(script);

    await new Promise((resolve) => {
        script.addEventListener('load', () => {
            resolve();
        });
    });
});

// host 调用 scene 的指定方法
ipc.on('call-method', async (options) => {
    const mod = Manager[options.module];

    if (!mod) {
        return event.reply(null);
    }

    return await mod[options.handler](...options.params);
});