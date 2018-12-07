'use strict';

const ipc = require('./ipc');

let readyFlag = false;

const manager = {
    isReady,
    Ipc: ipc,

    // 初始化的时候不能 require，因为部分模块依赖了 cc
    // 需要在引擎加载完成，并且 ready 之后 require
    Startup: require('./startup'),
    Camera: null,
    Scene: null,
    Node: null,
    Script: null,
    History: null,
    Selection: null,
    Operation: null,
    Gizmo: null,
    Assets: null,
    Prefab: null,
    Effect: null,

    Utils: null,
};

function isReady(bool, info) {
    if (bool !== undefined) {
        readyFlag = !!bool;

        manager.Camera = require('./camera').EditorCamera;
        manager.Scene = require('./scene');
        manager.Node = require('./node');
        manager.Script = require('./scripts');
        manager.History = require('./history');
        manager.Operation = require('./operation');
        manager.Gizmo = require('./gizmos');
        manager.Asset = require('./asset');
        manager.Prefab = require('./prefab');
        manager.Effect = require('./effects');

        manager.Utils = require(info.utils);

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

        // 用于编辑器绘制的背景和前景节点
        Manager.foregroundNode = new cc.Node('Editor Scene Foreground');
        Manager.backgroundNode = new cc.Node('Editor Scene Background');
        // 编辑器使用的节点不需要存储和显示在层级管理器
        Manager.foregroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
        Manager.backgroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
        // 这些节点应该是常驻节点
        cc.game.addPersistRootNode(Manager.foregroundNode);
        cc.game.addPersistRootNode(Manager.backgroundNode);

        ipc.ready();
    }
    return readyFlag;
}

module.exports = manager;
