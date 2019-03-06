'use strict';

let TransformGizmo = require('./transform-gizmo');
let ScaleGizmo3D = require('../../../3d/elements/transform/scale-gizmo');

class ScaleGizmo extends TransformGizmo {
    init() {
        this._proxyTransformGizmo = new ScaleGizmo3D(this.target);
        this._proxyTransformGizmo.init();
    }
}

module.exports = ScaleGizmo;
