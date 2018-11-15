'use strict';

const { EventEmitter } = require('events');

function bindEvent(operator) {
    const $body = document.body;

    // window 变化事件
    window.addEventListener('resize', () => {
        const bcr = $body.getBoundingClientRect();
        if (!window.cc) return;
        cc.view.setCanvasSize(bcr.width, bcr.height);
        cc.view.setDesignResolutionSize(bcr.width, bcr.height);
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
        window.addEventListener('load', () => {
            bindEvent(this);
        });
    }
}

module.exports = new Operation();
