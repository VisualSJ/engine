class TransformGizmo extends Editor.Gizmo {
    constructor(view, target) {
        super(view, target);

        this._proxyTransformGizmo = null;
    }
    layer() {
        return 'foreground';
    }

    onKeyDown(event) {

    }

    onKeyUp(event) {

    }

    onGizmoKeyDown(event) {
        if (this._proxyTransformGizmo) {
            this._proxyTransformGizmo.onGizmoKeyDown(event);
        }
    }

    onGizmoKeyUp(event) {
        if (this._proxyTransformGizmo) {
            this._proxyTransformGizmo.onGizmoKeyUp(event);
        }
    }

    visible() {
        return true;
    }

    dirty() {
        return true;
    }

    onUpdate() {
        if (this._proxyTransformGizmo) {
            //this._proxyTransformGizmo.updateDataFromController();
            this._proxyTransformGizmo.updateControllerTransform();
        }
    }

    onTargetUpdate() {
        if (this._proxyTransformGizmo) {
            this._proxyTransformGizmo.target = this.target;
        }
    }

    onShow() {
        if (this._proxyTransformGizmo) {
            this._proxyTransformGizmo.onShow();
        }
    }
    onHide() {
        if (this._proxyTransformGizmo) {
            this._proxyTransformGizmo.onHide();
        }
    }
}

module.exports = TransformGizmo;