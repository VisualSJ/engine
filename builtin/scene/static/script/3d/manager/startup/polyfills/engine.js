'use strict';

const { EventEmitter } = require('events');
window.CC_EDITOR = true;

class Engine extends EventEmitter {
    constructor() {
        super();
        this.attachedObjsForEditor = {};
    }

    off() { }

    getDesignResolutionSize() {
        return { width: 1280, height: 760 }; // 手写的设计分辨率
    }

    setDesignResolutionSize() { }
}

// 适配 cc.engine
// todo 引擎内发送了 node-attach-to-scene 等事件
cc.engine = new Engine();

// 适配 _Scene
window._Scene = {
    AssetsWatcher: {
        start() { },
        initComponent() { },
        stop() { },
    },
    Sandbox: {},
    DetectConflict: {
        beforeAddChild() { },
        afterAddChild() { },
    },
};

// 适配 cc._throw
cc._throw = cc.error;
