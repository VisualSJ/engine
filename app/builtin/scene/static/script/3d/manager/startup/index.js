'use strict';

const ipc = require('../ipc');

const polyfills = require('./polyfills');
const engine = require('./engine');
const overwrite = require('./overwrite');
const log = require('./log');

const LOCK = {
    engine: false,
    manager: false,
};

/**
 * 启动引擎
 */
async function initEngine(info) {
    if (LOCK.engine) {
        return;
    }
    LOCK.engine = true;

    // HACK 之前引擎代码里的 Editor
    await polyfills.editor();

    // 实际加载引擎
    await engine.requireEngine(info.path);

    // 初始化引擎的 utils，因为引擎启动过程中需要使用，所以需要提前
    window.Manager.Utils = require(info.utils);

    // HACk 其余代码
    await polyfills.engine();

    // 重写部分引擎代码
    await overwrite.assetLibrary();
    await overwrite.loader();

    // 配置引擎以及实际启动引擎
    await engine.configureStartup();
    await engine.openEngine();
    await engine.configureEngine();
}

/**
 * 启动各个管理器
 */
async function initManager(info) {
    if (LOCK.manager) {
        return;
    }
    LOCK.manager = true;

    log.init();

    const manager = window.Manager;

    manager.project = info.project;

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

    try {
        // 启动 effect 管理器，注册资源数据库内的 effect 资源
        await require('../effects').init();
    } catch (error) {
        console.error(error);
    }

    try {
        // 启动脚本管理器，注册资源数据库内的 effect 资源
        await require('../scripts').init(info.project);
    } catch (error) {
        console.error(error);
    }

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
    manager.Component = require('../component');
    manager.MinWindow = require('../min-window');

    // 创建编辑器使用的 camera
    manager.Camera.init();

    // 创建 gizmo
    manager.Gizmo.init();

    // 创建 gizmo
    manager.Selection.init();

    // 监听物体选中情况
    manager.MinWindow.init();

    // 初始化当前场景内的节点信息
    const scene = cc.director.getScene();
    scene && manager.Node.init(scene);
}

exports.engine = initEngine;
exports.manager = initManager;
