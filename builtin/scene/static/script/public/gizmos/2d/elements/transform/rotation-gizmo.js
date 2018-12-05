'use strict';
let TransformGizmo = require('./transform-gizmo');
let RotationGizmo3D = require('../../../3d/elements/transform/rotation-gizmo');
class RotationGizmo extends TransformGizmo {
    init() {
        this._proxyTransformGizmo = new RotationGizmo3D(this.target);
        this._proxyTransformGizmo.init();
    }
}

module.exports = RotationGizmo;
