'use strict';

const ipc = require('./ipc');

let readyFlag = false;

const manager = {
    isReady,
    Ipc: ipc,

    // 初始化的时候不能 require，因为部分模块依赖了 cc
    // 需要在引擎加载完成，并且 ready 之后 require
    Camera: null,
    Scene: null,
    Node: null,
    Script: null,
    History: null,
    Selection: null,
    Operation: null,
    Gizmo: null,

    get serialize() {
        return this._serialize();
    },
};

function isReady(bool) {
    if (bool !== undefined) {
        readyFlag = !!bool;

        manager.Camera = require('./camera');
        manager.Scene = require('./scene');
        manager.Node = require('./node');
        manager.Script = require('./scripts');
        manager.History = require('./history');
        manager.Selection = require('./selection');
        manager.Operation = require('./operation');
        manager.Gizmo = require('./gizmos');
        manager.Asset = require('./asset');

        ipc.ready();
    }
    return readyFlag;
}

module.exports = manager;
