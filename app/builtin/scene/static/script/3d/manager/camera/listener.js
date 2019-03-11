'use strict';

const operationManager = require('../operation');

/**
 * 将摄像机操作绑定到摄像机管理器上
 * @param {*} camera
 */
function bind(camera) {

    /**
     * 鼠标按下
     */
    operationManager.on('mousedown', (event) => {
        return camera.onMouseDown(event);
    });

    /**
     * 鼠标移动，如果在某个编辑模式下，发送 move 操作
     */
    operationManager.on('mousemove', (event) => {
        return camera.onMouseMove(event);
    });

    /**
     * 鼠标抬起，退出之前的编辑模式
     */
    operationManager.on('mouseup', (event) => {
        return camera.onMouseUp(event);
    });

    /**
     * 鼠标滚轮
     * 两指缩放以及平移
     */
    operationManager.on('wheel', (event) => {
        camera.onMouseWheel(event);
    });

    /**
     * 键盘事件
     */
    operationManager.on('keydown', (event) => {
        camera.onKeyDown(event);
    });

    /**
     * 键盘事件
     */
    operationManager.on('keyup', (event) => {
        camera.onKeyUp(event);
    });

}

exports.bind = bind;
