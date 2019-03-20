const CameraControllerBase = require('./camera-controller-base');
const utils = require('./utils');
let exitPanModeTimer = null;
const CameraMoveMode = utils.CameraMoveMode;
const operationManager = require('../operation');

class CameraController3D extends CameraControllerBase {
    init(camera) {
        super.init(camera);

        this._grid = utils.createGrid(50, 50);
        this._grid.enabled = false;

        this._lastPos = cc.v3();
        this._lastRot = cc.quat();
    }

    set active(value) {
        if (value) {
            this._grid.enabled = true;
            this._camera.projection = 1;
            this.node.setWorldPosition(this._lastPos);
            this.node.setWorldRotation(this._lastRot);
        } else {
            this._grid.enabled = false;
            this.node.getWorldPosition(this._lastPos);
            this.node.getWorldRotation(this._lastRot);
            clearTimeout(exitPanModeTimer);
        }
    }

    onMouseDown(event) {
        if (this.camera_move_mode !== CameraMoveMode.NONE) {
            return;
        }

        if (event.leftButton && event.altKey) {
            // 鼠标左键 + CtrlOrCommand
            this.enterOrbitMode();
            return false;
        } else if (event.middleButton) {
            // 鼠标中间键
            this.enterPanMode();
            operationManager.requestPointerLock();
            return false;
        } else if (event.rightButton) {
            // 鼠标右键
            this.enterWanderMode();
            return false;
        }
    }

    onMouseMove(event) {
        if (this.camera_move_mode === CameraMoveMode.NONE) {
            return;
        }
        this.move(event.moveDeltaX, event.moveDeltaY);
        return true;
    }

    onMouseUp(event) {
        if (this.camera_move_mode === CameraMoveMode.NONE) {
            return;
        }
        if (event.leftButton) {
            if (this.camera_move_mode === CameraMoveMode.ORBIT) {
                this.exitOrbitMode();
                return false;
            }
        } else if (event.middleButton) { // middle button: panning
            this.exitPanMode();
            operationManager.exitPointerLock();
        } else if (event.rightButton) { // right button: wander
            this.exitWanderMode();
        }
    }

    onMouseWheel(event) {
        if (Math.max(Math.abs(event.wheelDeltaX), Math.abs(event.wheelDeltaY)) > 60) {
            this.scale(-event.wheelDeltaY / 6);
        } else {
            if (this.camera_move_mode !== CameraMoveMode.PAN) {
                this.enterPanMode();
            }
            this.move(event.wheelDeltaX, event.wheelDeltaY);
            // for touch control
            clearTimeout(exitPanModeTimer);
            exitPanModeTimer = setTimeout(() => {
                this.exitPanMode();
                operationManager.exitPointerLock();
            }, 100);
        }
    }

    onKeyDown(event) {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': this.velocity.x = this.curMovSpeed; break;
            case 'a': this.velocity.x = -this.curMovSpeed; break;
            case 'e': this.velocity.y = this.curMovSpeed; break;
            case 'q': this.velocity.y = -this.curMovSpeed; break;
            case 's': this.velocity.z = this.curMovSpeed; break;
            case 'w': this.velocity.z = -this.curMovSpeed; break;
        }
    }

    onKeyUp(event) {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': if (this.velocity.x > 0) { this.velocity.x = 0; } break;
            case 'a': if (this.velocity.x < 0) { this.velocity.x = 0; } break;
            case 'e': if (this.velocity.y > 0) { this.velocity.y = 0; } break;
            case 'q': if (this.velocity.y < 0) { this.velocity.y = 0; } break;
            case 's': if (this.velocity.z > 0) { this.velocity.z = 0; } break;
            case 'w': if (this.velocity.z < 0) { this.velocity.z = 0; } break;
            case 'h': this.focus(); break;
        }
    }
}

module.exports = CameraController3D;
