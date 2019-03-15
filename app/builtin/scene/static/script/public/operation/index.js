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
        operator.emit('resize', { width: bcr.width, height: bcr.height });
    });
}

/**
 * 所有场景的操作管理
 */
class Operation {
    constructor() {
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
         *
         * 拖拽操作
         * dragover
         * dragleave
         * drop
         *
         * 数据响应
         * confirm
         */
        this._events = new Map();

        bindEvent(this);
        window.addEventListener('load', () => {
            bindEvent(this);
        });
    }

    /**
     * 锁定鼠标
     */
    requestPointerLock() {
        ipcManager.send('lock-pointer', true);
    }

    /**
     * 退出锁定鼠标
     */
    exitPointerLock() {
        ipcManager.send('lock-pointer', false);
    }

    /**
     * 更改鼠标样式
     * @param {*} type 
     */
    changePointer(type) {
        const allow = [
            '-webkit-grab', '-webkit-grabbing',
            'zoom-in', 'zomm-out',

            'n-resize', 's-resize', 'e-resize', 'w-resize',
            'ne-resize', 'ew-resize', 'nw-resize', 'ns-resize', 'se-resize', 'sw-resize',
            'nesw-resize', 'nwse-resize',
            'col-resize', 'row-resize',

            'text', 'vertical-text', 'context-menu',

            'copy', 'move',  'none', 'default', 'pointer',

            'inherit', 'initial',
    
            'alias', 'all-scroll', 'auto', 'cell', 'crosshair',
            'no-drop', 'not-allowed', 'progress', 'unset', 'wait',
        ].includes(type);
        if (!allow) {
            type = 'default';
        }
        ipcManager.send('change-pointer', type);
    }

    /**
     * 发送
     * @param {*} message
     * @param  {...any} args
     */
    emit(message, ...args) {
        const events = this._events.get(message);
        if (!events) {
            return;
        }

        for (let i = 0; i < events.length; i++) {
            const handler = events[i];
            let result;
            if ('function' === typeof handler) {
                result = handler(...args);
            } else {
                const { listener } = handler;
                result = listener(...args);
            }
            // 如果监听函数返回了 false，则直接中断之后的所有处理
            if (result === false) {
                return;
            }
        }
    }

    /**
     * 重写 on 方法
     * @param {String} type
     * @param {Function} listener
     * @param {Number=} priority 数值越大优先级越高
     * @memberof Operation
     */
    on(type, listener, priority) {
        return this.addListener(type, listener, priority);
    }

    /**
     * 重写 addListener 方法
     * @param {String} type
     * @param {Function} listener
     * @param {Number=} priority
     * @memberof Operation
     */
    addListener(type, listener, priority) {
        if (!this._events.has(type)) {
            this._events.set(type, []);
        }
        const events = this._events.get(type);
        if (!priority) {
            events.push(listener);
        } else {
            let index = 0;
            let endLoop = false;
            for (let i = 0; i < events.length && !endLoop; i++) {
                if (!events[i].priority) {
                    index = i;
                    endLoop = true;
                    break;
                }
                if (events[i].priority < priority) {
                    index = i;
                    endLoop = true;
                    break;
                }
                index++;
            }

            events.splice(index, 0, { listener, priority });
        }

        return this;
    }
}

module.exports = new Operation();
