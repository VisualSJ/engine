'use strict';
const CameraComponentGizmo = require('../../../3d/elements/components/camera-component-gizmo');
const TransformToolData = require('../../../utils/transform-tool-data');

class CameraGizmo extends Editor.Gizmo {
    init () {
        this._CameraCompGizmo = new CameraComponentGizmo(this.target);
        this._CameraCompGizmo.init();
    }

    visible () {
        // 3D编辑时才显示
        return !TransformToolData.is2D && (this.selecting || this.editing);
    }

    onUpdate () {
        if (this._CameraCompGizmo) {
            this._CameraCompGizmo.updateControllerData();
        }
    }

    onTargetUpdate () {
        if (this._CameraCompGizmo) {
            this._CameraCompGizmo.target = this.target;
        }
    }

    onShow () {
        if (this._CameraCompGizmo) {
            this._CameraCompGizmo.onShow();
        }
    }

    onHide () {
        if (this._CameraCompGizmo) {
            this._CameraCompGizmo.onHide();
        }
    }
}

module.exports = CameraGizmo;