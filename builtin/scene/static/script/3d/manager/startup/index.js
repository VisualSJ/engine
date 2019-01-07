'use strict';

const ipc = require('../ipc');

const polyfills = require('./polyfills');
const engine = require('./engine');
const overwrite = require('./overwrite');

const scene = require('../scene');
// const manager = require('../index');

/**
 * 启动引擎
 */
async function init(info) {
    await polyfills.editor();

    await engine.requireEngine(info.path);

    await polyfills.engine();
    await overwrite.assetLibrary();
    await overwrite.loader();

    await engine.configureStartup();
    await engine.openEngine();
    await engine.configureEngine();

    window.Manager = { Startup: module.exports };

    ipc.send('engine:ready');
}

/**
 * 启动各个管理器
 */
async function manager(info) {
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

    window.Manager.Utils = require(info.utils);
    const manager = window.Manager;

    // 用于编辑器绘制的背景和前景节点
    const foregroundNode = new cc.Node('Editor Scene Foreground');
    const backgroundNode = new cc.Node('Editor Scene Background');

    // 编辑器使用的节点不需要存储和显示在层级管理器
    foregroundNode._objFlags |= cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy;
    backgroundNode._objFlags |= cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy;

    // 这些节点应该是常驻节点
    cc.game.addPersistRootNode(foregroundNode);
    cc.game.addPersistRootNode(backgroundNode);

    manager.foregroundNode = foregroundNode;
    manager.backgroundNode = backgroundNode;

    // 启动 effect 管理器，注册资源数据库内的 effect 资源
    await require('../effects').init();

    // 启动脚本管理器，注册资源数据库内的 effect 资源
    await require('../scripts').init();

    // 给 Manager 挂上所有的管理器
    manager.Ipc = require('../ipc');
    manager.Camera = require('../camera');
    manager.Scene = require('../scene');
    manager.Node = require('../node');
    manager.Script = require('../scripts');
    manager.History = require('../history');
    manager.Operation = require('../operation');
    manager.Gizmo = require('../gizmos');
    manager.Asset = require('../asset');
    manager.Prefab = require('../prefab');
    manager.Effect = require('../effects');
    manager.Selection = require('../selection');
    manager.Preview = require('../preview');

    // 创建编辑器使用的 camera
    manager.Camera.init();

    // 创建 gizmo
    manager.Gizmo.init();

    // 创建 gizmo
    manager.Selection.init();

    // 标记准备就绪，开始接收主窗口发送过来的 ipc 消息
    ipc.ready();
    ipc.send('manager:ready');
}

exports.init = init;
exports.manager = manager;
