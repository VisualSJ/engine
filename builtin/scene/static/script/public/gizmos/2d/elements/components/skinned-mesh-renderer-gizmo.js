const SkinningModelComponentGizmo = require('../../../3d/elements/components/skinning-model-component-gizmo');

class SkinnedMeshRendererGizmo extends Editor.Gizmo {
    init() {
        this._SkinnedModelCompGizmo = new SkinningModelComponentGizmo(this.target);
        this._SkinnedModelCompGizmo.init();
    }

    onUpdate() {
        if (this._SkinnedModelCompGizmo) {
            this._SkinnedModelCompGizmo.updateControllerTransform();
        }
    }

    onTargetUpdate() {
        if (this._SkinnedModelCompGizmo) {
            this._SkinnedModelCompGizmo.target = this.target;
        }
    }

    onShow() {
        if (this._SkinnedModelCompGizmo) {
            this._SkinnedModelCompGizmo.onShow();
        }
    }

    onHide() {
        if (this._SkinnedModelCompGizmo) {
            this._SkinnedModelCompGizmo.onHide();
        }
    }
}

module.exports = SkinnedMeshRendererGizmo;