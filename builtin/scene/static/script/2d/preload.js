'use strict';

const ipc = require('../ipc/webview');

let isReady = false;
let isInit = false;

// 放到全局, 便于调试
// 不能放到主页面内, 应该避免主页内的全局参数污染
window.Manager = {
    Ipc: ipc,
    Init: require('./manager/init'),
    Scene: require('./manager/scene'),
    get serialize() {
        return this._serialize();
    },
};

// 初始化指定版本的引擎, 成功后通知 host
ipc.on('init', async (info) => {
    // 防止重复初始化
    if (isInit) {
        return;
    }
    isInit = true;
    
    // 适配 Editor
    require('./polyfills/editor');

    // 初始化引擎
    await Manager.Init.engine(info);

    // 重写引擎的部分方法
    await Manager.Init.utils(info.utils);

    // 改动部分
    await Manager.Init.system();

    if (typeof info.uuid === 'string') {
        await Manager.Scene.open(info.uuid);
    }

    ipc.ready();

    // 标记已经准备就绪
    isReady = true;
});

// host 调用 scene 的指定方法
ipc.on('call-method', async (options) => {
    // 防止初始化之前使用接口
    if (!isReady) {
        return;
    }

    const mod = Manager[options.module];

    if (!mod) {
        throw new Error(`Module [${options.module}] does not exist`);
    }

    if (!mod[options.handler]) {
        throw new Error(`Method [${options.handler}] does not exist`);
    }

    return await mod[options.handler](...options.params);
});

// 延迟一帧发送，否则有几率 host 收不到消息
requestAnimationFrame(async () => {
    const info = await Manager.Ipc.send('query-scene-info');
    try {
        Manager.Ipc.emit('init', info);
    } catch (error) {
        console.error(error);
    }
});
