'use strict';

const { vec3, quat } = cc.vmath;
const CameraControllerBase = require('./camera-controller-base');
const utils = require('./utils');
const CameraMoveMode = utils.CameraMoveMode;
const TransformToolData = require('../../../public/gizmos/utils/transform-tool-data');

class CameraController2D extends CameraControllerBase {

    init(camera) {
        super.init(camera);

        this.panningSpeed = 1.5;
    }

    set active(value) {
        if (value) {
            this._camera.projection = 0;    //0:ortho,1:perspective

            let cameraRot = cc.quat();
            //quat.fromEuler(cameraRot, 0, 0, 0);
            this.node.setWorldRotation(cameraRot);
            let worldPos = cc.v3();
            let gameCanvasWidth = 0;
            let gameCanvasHeight = 0;
            let canvasComps = utils.queryComponent(cc.CanvasComponent);
            if (canvasComps.length > 0) {
                canvasComps[0].node.getWorldPosition(worldPos);
                let canvasSize = canvasComps[0].designResolution;
                gameCanvasWidth = canvasSize.width;
                gameCanvasHeight = canvasSize.height;
            }
            worldPos.z = 1000;
            this.node.setWorldPosition(worldPos);

            // calculate scale
            let scale = 1;
            let editorViewSize = cc.view.getCanvasSize();
            let fitWidth = editorViewSize.width - 10;
            let fitHeight = editorViewSize.height - 10;

            if (gameCanvasWidth <= fitWidth && gameCanvasHeight <= fitHeight) {
                scale = 1;
            } else {
                let result = this.fitSize(gameCanvasWidth, gameCanvasHeight,
                            fitWidth, fitHeight);
                scale = this.getSizeScale(result[0], result[1], gameCanvasWidth, gameCanvasHeight);
            }

            this._updateOrthoHeight(scale);
        }
    }

    _updateOrthoHeight(scale) {
        let orthoScale = 1;
        if (scale > 0) {
            orthoScale = scale;
        }

        this._camera.orthoHeight = cc.game.canvas.height / 2 / cc.view._scaleY / orthoScale;
        TransformToolData.scale2D = orthoScale;
    }

    // focus(nodes) {

    // }

    smoothScale(curScale, delta) {
        let scale = curScale;
        scale = Math.pow(2, delta * 0.002) * scale;

        return scale;
    }

    /**
     * @method fitSize
     * @param {number} srcWidth
     * @param {number} srcHeight
     * @param {number} destWidth
     * @param {number} destHeight
     * @return {number[]} - [width, height]
     */
    fitSize(srcWidth, srcHeight, destWidth, destHeight) {
        let width = 0;
        let height = 0;

        if (
        srcWidth > destWidth &&
        srcHeight > destHeight
        ) {
        width = destWidth;
        height = srcHeight * destWidth / srcWidth;

        if (height > destHeight) {
            height = destHeight;
            width = srcWidth * destHeight / srcHeight;
        }

        } else if (srcWidth > destWidth) {
        width = destWidth;
        height = srcHeight * destWidth / srcWidth;

        } else if (srcHeight > destHeight) {
        width = srcWidth * destHeight / srcHeight;
        height = destHeight;

        } else {
        width = srcWidth;
        height = srcHeight;
        }

        return [width, height];
    }

    getSizeScale(newWidth, newHeight, oldWidth, oldHeight) {
        let scaleWidth = oldWidth <= 0 ? 1 : newWidth / oldWidth;
        let scaleHeight = oldHeight <= 0 ? 1 : newHeight / oldHeight;

        let scale = Math.max(scaleWidth, scaleHeight);
        return scale;
    }

    scale(delta) {
        let newScale = this.smoothScale(TransformToolData.scale2D, delta);
        this._updateOrthoHeight(newScale);
    }

    onMouseDown(event) {
        if (this.camera_move_mode !== CameraMoveMode.NONE) {
            return;
        }

        if (event.middleButton) {
            // 鼠标中间键
            this.enterPanMode(false);
            return false;
        } else if (event.rightButton) {
            // 鼠标右键
            this.enterPanMode(false);
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

        if (event.middleButton) { // middle button: panning
            this.exitPanMode();
        } else if (event.rightButton) { // right button: panning
            this.exitPanMode();
        }
    }

    onMouseWheel(event) {
        if (Math.max(Math.abs(event.wheelDeltaX), Math.abs(event.wheelDeltaY)) > 60) {
            this.scale(event.wheelDeltaY / 6);
        } else {
            if (this.camera_move_mode !== CameraMoveMode.PAN) {
                this.enterPanMode();
            }
            this.move(event.wheelDeltaX, event.wheelDeltaY);
        }
    }

    onKeyDown(event) {

    }

    onKeyUp(event) {

    }

    // onUpdate() {

    // }
}

module.exports = CameraController2D;
