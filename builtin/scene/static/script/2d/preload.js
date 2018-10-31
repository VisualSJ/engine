'use strict';

const ipc = require('../ipc/webview');

let isReady = false;

// 放到全局, 便于调试
// 不能放到主页面内, 应该避免主页内的全局参数污染
window.Manager = {
    Ipc: ipc,
    Init: {
        engine: require('./init/engine'),
        system: require('./init/system'),
        utils: require('./init/utils'),
    },
    Scene: require('./manager/scene'),
    Script: require('./manager/scripts'),
    History: require('./manager/history'),
    get serialize() {
        return this._serialize();
    },
};

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

// 页面启动完成，自动开始初始化引擎
// 延迟一帧发送，否则有几率 host 收不到消息
requestAnimationFrame(async () => {
    // 适配 Editor
    require('./polyfills/editor');

    ////////////////
    // 1. 启动引擎
    const info = await Manager.Ipc.send('query-engine');
    await Manager.Init.engine(info);

    // 重写引擎的部分方法
    await Manager.Init.utils(info.utils);

    // 改动部分
    await Manager.Init.system();

    // 加载脚本
    const scripts = await Manager.Ipc.send('query-scripts');
    await Promise.all(scripts.map((uuid) => {
        return Manager.Script.loadScript(uuid);
    }));

    // 启动场景
    const scene = await Manager.Ipc.send('query-scene');
    if (typeof scene === 'string') {
        await Manager.Scene.open(scene);
    }

    // 标记已经准备就绪
    ipc.ready();
    isReady = true;
});
