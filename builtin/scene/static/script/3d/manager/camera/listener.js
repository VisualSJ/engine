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
        if (camera.camera_move_mode !== camera.CameraMoveMode.NONE) {
            return;
        }

        if (event.leftButton && event.altKey) {
            // 鼠标左键 + CtrlOrCommand
            camera.enterOrbitMode();
            return false;
        } else if (event.middleButton) {
            // 鼠标中间键
            camera.enterPanMode();
            return false;
        } else if (event.rightButton) {
            // 鼠标右键
            camera.enterWanderMode();
            return false;
        }
    });

    /**
     * 鼠标移动，如果在某个编辑模式下，发送 move 操作
     */
    operationManager.on('mousemove', (event) => {
        if (camera.camera_move_mode === camera.CameraMoveMode.NONE) {
            return;
        }
        camera.move(event.moveDeltaX, event.moveDeltaY);
        return true;
    });

    /**
     * 鼠标抬起，退出之前的编辑模式
     */
    operationManager.on('mouseup', (event) => {
        if (camera.camera_move_mode === camera.CameraMoveMode.NONE) {
            return;
        }
        if (event.leftButton) {
            if (camera.camera_move_mode === camera.CameraMoveMode.ORBIT) {
                camera.exitOrbitMode();
                return false;
            }
        } else if (event.middleButton) { // middle button: panning
            camera.exitPanMode();
        } else if (event.rightButton) { // right button: wander
            camera.exitWanderMode();
        }
    });

    let exitPanModeTimer = null;
    /**
     * 鼠标滚轮
     * 两指缩放以及平移
     */
    operationManager.on('wheel', (event) => {
        if (Math.max(Math.abs(event.wheelDeltaX), Math.abs(event.wheelDeltaY)) > 60) {
            camera.scale(-event.wheelDeltaY / 6);
        } else {
            if (camera.camera_move_mode !== camera.CameraMoveMode.PAN) {
                camera.enterPanMode();
            }
            camera.move(event.wheelDeltaX, event.wheelDeltaY);
            clearTimeout(exitPanModeTimer);
            exitPanModeTimer = setTimeout(() => {
                camera.exitPanMode();
            }, 400);
        }
    });

    /**
     * 键盘事件
     */
    operationManager.on('keydown', (event) => {
        camera.shiftKey = event.shiftKey;
        camera.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': camera.velocity.x = camera.curMovSpeed; break;
            case 'a': camera.velocity.x = -camera.curMovSpeed; break;
            case 'e': camera.velocity.y = camera.curMovSpeed; break;
            case 'q': camera.velocity.y = -camera.curMovSpeed; break;
            case 's': camera.velocity.z = camera.curMovSpeed; break;
            case 'w': camera.velocity.z = -camera.curMovSpeed; break;
        }
    });

    /**
     * 键盘事件
     */
    operationManager.on('keyup', (event) => {
        camera.shiftKey = event.shiftKey;
        camera.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': if (camera.velocity.x > 0) { camera.velocity.x = 0; } break;
            case 'a': if (camera.velocity.x < 0) { camera.velocity.x = 0; } break;
            case 'e': if (camera.velocity.y > 0) { camera.velocity.y = 0; } break;
            case 'q': if (camera.velocity.y < 0) { camera.velocity.y = 0; } break;
            case 's': if (camera.velocity.z > 0) { camera.velocity.z = 0; } break;
            case 'w': if (camera.velocity.z < 0) { camera.velocity.z = 0; } break;
            case 'h': camera.focus(); break;
        }
    });

}

exports.bind = bind;
