'use strict';

const { EventEmitter } = require('events');
const utils = require('./utils');

const CameraMoveMode = utils.CameraMoveMode;

class CameraControllerBase extends EventEmitter {

    init(camera) {
        this._camera = camera;
        this.node = this._camera.node;
        this.camera_move_mode = CameraMoveMode.NONE;
    }

    focus(nodes) {}

    onMouseDown(event) {}

    onMouseMove(event) {}

    onMouseUp(event) {}

    onMouseWheel(event) {}

    onKeyDown(event) {}

    onKeyUp(event) {}

    onResize() {}

    onUpdate() {}
}

module.exports = CameraControllerBase;
