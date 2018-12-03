'use strict';

const manager = require('./manager');

// 延迟一帧启动引擎
//   1. 注册 Editor 以及引擎需要用的标记
//   2. 启动引擎
//   3. 启动引擎进程内的模块管理器
//   4. 重写资源加载相关的函数
requestAnimationFrame(async () => {
    window.CC_EDITOR = true;
    // 初始化 Editor
    require('./polyfills/editor');

    // 启动引擎
    const info = await manager.Ipc.send('query-engine');
    await require('./init/engine')(info);

    // 引擎加载完成后立即注册全局的 Manager
    window.Manager = manager;

    // 重写 loadRes、loadResArray、loadResDir 相关函数
    await require('./init/loader')();

    // 重写引擎的部分方法
    await require('./init/utils')(info.utils);

    // 启动部分管理系统（camera 等）
    await require('./init/system')();
    await require('./polyfills/engine');

    // 标记已经准备就绪
    manager.isReady(true);

    // 加载脚本
    const scripts = await Manager.Ipc.send('query-scripts');
    await Promise.all(
        scripts.map((uuid) => {
            return manager.Script.loadScript(uuid);
        })
    );

    // 处理 effect
    const effects = await Manager.Ipc.send('query-effects');
    await Promise.all(
        effects.map((uuid) => {
            return manager.Effect.registerEffect(uuid);
        })
    );

    // 启动场景，之前启动了的话，会在 open 方法内被终止
    const scene = await Manager.Ipc.send('query-scene');
    await manager.Scene.open(scene || '');
});

// 进程刷新的时候，需要广播
window.addEventListener('beforeunload', () => {
    Manager.Ipc.send('broadcast', 'scene:close');
});
