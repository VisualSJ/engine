'use strict';

const { EventEmitter } = require('events');
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

let _policy = null;

function bindEvent(operator) {
    if (isBind) {
        return;
    }
    isBind = true;
    const $body = document.body;

    _policy = new cc.ResolutionPolicy(new ProportionalToScene(), cc.ResolutionPolicy.ContentStrategy.SHOW_ALL);

    // window 变化事件
    window.addEventListener('resize', () => {
        const bcr = $body.getBoundingClientRect();
        if (!window.cc) {
            return;
        }
        cc.view.setCanvasSize(bcr.width, bcr.height);
        cc.view.setDesignResolutionSize(bcr.width, bcr.height, _policy || cc.ResolutionPolicy.SHOW_ALL);
        // operator.emit('resize', { width: bcr.width, height: bcr.height });
    });

    // 鼠标左键按住移动的情况下，发送 rect
    // 鼠标左键按下到抬起没有移动位置，发送 hit
    $body.addEventListener('mousedown', (event) => {
        if (event.button !== 0) {
            return;
        }

        let isRect = false;

        const startPoint = {
            x: event.pageX,
            y: event.pageY,
        };

        const move = (event) => {
            const endPoint = {
                x: event.pageX,
                y: event.pageY,
            };
            isRect = true;
            operator.emit('rect-start');
            operator.emit('rect-change', {
                x: Math.min(startPoint.x, endPoint.x),
                y: Math.min(startPoint.y, endPoint.y),
                width: Math.abs(startPoint.x - endPoint.x),
                height: Math.abs(startPoint.y - endPoint.y),
            });
        };

        const up = (event) => {

            if (event.pageX === startPoint.x && event.pageY === startPoint.y) {
                operator.emit('hit', {
                    x: event.pageX,
                    y: event.pageY,
                });
            }

            if (isRect) {
                operator.emit('rect-end');
            }

            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
        };

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });

    // 鼠标中键按住移动的情况下，发送 move 事件
    $body.addEventListener('mousedown', (event) => {
        if (event.button !== 1) {
            return;
        }

        let isMove = false;
        const startPoint = {
            x: event.pageX,
            y: event.pageY,
        };

        const move = (event) => {
            const endPoint = {
                x: event.pageX,
                y: event.pageY,
            };
            isMove = true;
            operator.emit('move-start');
            operator.emit('move-change', {
                offsetX: endPoint.x - startPoint.x,
                offsetY: endPoint.y - startPoint.y,
            });
            startPoint.x = endPoint.x;
            startPoint.y = endPoint.y;
        };

        const up = () => {
            if (isMove) {
                operator.emit('move-end');
            }
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
        };

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });

    // 鼠标右键按住移动的情况下，发送 rotation 事件
    $body.addEventListener('mousedown', (event) => {
        if (event.button !== 2) {
            return;
        }

        let isMove = false;
        const startPoint = {
            x: event.pageX,
            y: event.pageY,
        };

        const move = (event) => {
            const endPoint = {
                x: event.pageX,
                y: event.pageY,
            };
            isMove = true;
            operator.emit('rotation-start');
            operator.emit('rotation-change', {
                offsetX: endPoint.x - startPoint.x,
                offsetY: endPoint.y - startPoint.y,
            });
            startPoint.x = endPoint.x;
            startPoint.y = endPoint.y;
        };

        const up = () => {
            if (isMove) {
                operator.emit('rotation-end');
            }
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
        };

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });

    // 鼠标滚轮滚动的处理
    document.addEventListener('mousewheel', (event) => {
        if (event.wheelDelta > 100 || event.wheelDelta < -100) {
            operator.emit('zoom', {
                x: event.pageX,
                y: event.pageY,
                offset: event.wheelDelta,
            });
        } else {
            operator.emit('move-start');
            operator.emit('move-change', {
                offsetX: event.wheelDeltaX,
                offsetY: event.wheelDeltaY,
            });
            operator.emit('move-end');
        }
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
         * 点击
         * hit
         *
         * 移动操作
         * move-start
         * move-change
         * move-end
         *
         * 框选操作
         * rect-start
         * rect-change
         * rect-end
         */
        bindEvent(this);
        window.addEventListener('load', () => {
            bindEvent(this);
        });
    }
}

module.exports = new Operation();
