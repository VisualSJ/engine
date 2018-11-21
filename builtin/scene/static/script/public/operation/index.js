'use strict';

const { EventEmitter } = require('events');

const ipcManager = require('../ipc/webview');

let isBind = false;

class ProportionalToScene extends cc.ResolutionPolicy.ContainerStrategy {
    apply(view, designedResolution) {
        const frameW = view._frameSize.width;
        const frameH = view._frameSize.height;
        const containerStyle = cc.game.container.style;
        const designW = designedResolution.width;
        const designH = designedResolution.height;
        const scaleX = frameW / designW;
        const scaleY = frameH / designH;
        let containerW;
        let containerH;

        if (scaleX < scaleY) {
            containerW = frameW;
            containerH = designH * scaleX;
        } else {
            containerW = designW * scaleY;
            containerH = frameH;
        }

        // Adjust container size with integer value
        const offx = Math.round((frameW - containerW) / 2);
        const offy = Math.round((frameH - containerH) / 2);
        containerW = frameW - 2 * offx;
        containerH = frameH - 2 * offy;

        this._setupContainer(view, containerW, containerH);
        containerStyle.margin = '0';
    }
}

function bindEvent(operator) {
    if (isBind) {
        return;
    }
    isBind = true;
    const $body = document.body;

    const policy = new cc.ResolutionPolicy(new ProportionalToScene(), cc.ResolutionPolicy.ContentStrategy.SHOW_ALL);

    // window 变化事件
    window.addEventListener('resize', () => {
        const bcr = $body.getBoundingClientRect();
        if (!window.cc) {
            return;
        }
        cc.view.setCanvasSize(bcr.width, bcr.height);
        cc.view.setDesignResolutionSize(bcr.width, bcr.height, policy || cc.ResolutionPolicy.SHOW_ALL);
        // operator.emit('resize', { width: bcr.width, height: bcr.height });
    });
}

/**
 * 所有场景的操作管理
 */
class Operation extends EventEmitter {

    constructor() {
        super();
        /**
         * 窗口变化
         * resize
         *
         * 鼠标操作
         * mousedown
         * mousemove
         * mouseup
         *
         * 键盘操作
         * keydown
         * keyup
         */
        bindEvent(this);
        window.addEventListener('load', () => {
            bindEvent(this);
        });
    }

    requestPointerLock() {
        ipcManager.send('lock-pointer', true);
    }

    exitPointerLock() {
        ipcManager.send('lock-pointer', false);
    }
}

module.exports = new Operation();
