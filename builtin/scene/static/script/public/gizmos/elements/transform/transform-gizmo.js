let Gizmo = require('../gizmo');

class TransformGizmo extends Gizmo {
    constructor(target) {
        super(target);
        this._controller = null;
    }

    onShow() {
        if (this._controller) {
            this._controller.show();
            if (this.updateControllerTransform) {
                this.updateControllerTransform();
            }
        }
    }

    onHide() {

        if (this._controller) {
            this._controller.hide();
        }
    }

    onTargetUpdate() {
        if (this._controller && this.updateControllerTransform) {
            this.updateControllerTransform();
        }
    }
}

module.exports = TransformGizmo;
