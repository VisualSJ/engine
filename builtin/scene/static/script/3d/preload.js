'use strict';

const ipc = require('../ipc/webview');

let isReady = false;

// 放到全局, 便于调试
// 不能放到主页面内, 应该避免主页内的全局参数污染
window.Manager = {
    Ipc: ipc,

    Camera: require('./manager/camera'),
    Scene: require('./manager/scene'),
    Node: require('./manager/node'),
    Script: require('./manager/scripts'),
    History: require('./manager/history'),
    Selection: require('./manager/selection'),
    Operation: require('./manager/operation'),

    get serialize() {
        return this._serialize();
    },
};

// host 调用 scene 的指定方法
ipc.on('call-method', async (options) => {
    // 防止初始化之前使用接口
    if (!isReady) {
        throw new Error(`The scene is not ready.`);
    }
    const mod = Manager[options.module];
    if (!mod) {
        throw new Error(`Module [${options.module}] does not exist.`);
    }
    if (!mod[options.handler]) {
        throw new Error(`Method [${options.handler}] does not exist.`);
    }
    return await mod[options.handler](...options.params);
});

// 延迟一帧启动引擎
requestAnimationFrame(async () => {
    // 初始化 Editor
    require('./polyfills/editor');

    // 启动引擎
    const info = await ipc.send('query-engine');
    await require('./init/engine')(info);

    await require('./init/assets')();

    // 重写引擎的部分方法
    await require('./init/utils')(info.utils);

    // 用于编辑器绘制的背景和前景节点
    Manager.foregroundNode = new cc.Node('Editor Scene Foreground');
    Manager.backgroundNode = new cc.Node('Editor Scene Background');
    // 编辑器使用的节点不需要存储和显示在层级管理器
    Manager.foregroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
    Manager.backgroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
    // 这些节点应该是常驻节点
    cc.game.addPersistRootNode(Manager.foregroundNode);
    cc.game.addPersistRootNode(Manager.backgroundNode);

    // 启动部分管理系统（camera 等）
    await require('./init/system')();

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
