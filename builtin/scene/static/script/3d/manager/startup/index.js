'use strict';

const manager = require('../index');
const ipc = require('../ipc');
const scene = require('../scene');

const polyfills = require('./polyfills');
const engine = require('./engine');
const overwrite = require('./overwrite');

async function run() {
    const info = await ipc.send('query-engine');
    await polyfills.editor();

    await engine.requireEngine(info.path);

    await polyfills.engine();
    await overwrite.assetLibrary();
    await overwrite.loader();

    await engine.configureStartup();
    await engine.openEngine();
    await engine.configureEngine();

    // 标记已经准备就绪
    await manager.isReady(true, info);

    // 处理 effect
    const effects = await ipc.send('query-effects');
    await Promise.all(
        effects.map((uuid) => {
            return manager.Effect.registerEffect(uuid);
        })
    );

    await manager.Camera.init();
    await manager.Gizmo.init();

    manager.Selection = require('../selection');

    // 加载脚本
    const scripts = await ipc.send('query-scripts');
    await Promise.all(
        scripts.map((uuid) => {
            return manager.Script.loadScript(uuid);
        })
    );

    // 启动场景，之前启动了的话，会在 open 方法内被终止
    const uuid = await ipc.send('query-scene');
    await scene.open(uuid || '');
}

exports.run = run;
