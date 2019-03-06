'use strict';
const LightComponentGizmo3D = require('../../../3d/elements/components/light-component-gizmo');
const TransformToolData = require('../../../utils/transform-tool-data');

class CameraGizmo extends Editor.Gizmo {
    init () {
        this._LightCompGizmo = new LightComponentGizmo3D(this.target);
        this._LightCompGizmo.init();
    }

    visible () {
        // 3D编辑时才显示
        return !TransformToolData.is2D && (this.selecting || this.editing);
    }

    onUpdate () {
        if (this._LightCompGizmo) {
            this._LightCompGizmo.updateControllerData();
        }
    }

    onTargetUpdate () {
        if (this._LightCompGizmo) {
            this._LightCompGizmo.target = this.target;
        }
    }

    onShow () {
        if (this._LightCompGizmo) {
            this._LightCompGizmo.onShow();
        }
    }

    onHide () {
        if (this._LightCompGizmo) {
            this._LightCompGizmo.onHide();
        }
    }
}

module.exports = CameraGizmo;