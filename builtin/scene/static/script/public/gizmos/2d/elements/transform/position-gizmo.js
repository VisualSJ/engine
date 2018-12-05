'use strict';
let TransformGizmo = require('./transform-gizmo');
let PositionGizmo3D = require('../../../3d/elements/transform/position-gizmo');
class PositionGizmo extends TransformGizmo {
    init() {
        this._proxyTransformGizmo = new PositionGizmo3D(this.target);
        this._proxyTransformGizmo.init();
    }
}

module.exports = PositionGizmo;
