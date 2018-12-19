'use strict';
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let FrustumController = require('../controller/frustum-controller');
let Gizmo = require('../gizmo-base');
const { getCameraData } = require('../../../utils/engine');

const vec3 = cc.vmath.vec3;

class CameraComponentGizmo extends Gizmo {
    init() {
        this.createController();
        this._isInited = true;
    }

    onShow() {
        this._controller.show();
        this.updateControllerTransform();
    }

    onHide() {
        this._controller.hide();
        let nodes = this.nodes;
        this.unRegisterNodeEvents(nodes, this.onNodeChanged, this);
        this.unRegisterTransformEvent(nodes, this.onNodeTransformChanged, this);
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        this._controller = new FrustumController(gizmoRoot);
    }

    updateControllerTransform() {
        this.updateControllerData();
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        let cameraData = getCameraData(this.target);
        if (cameraData) {
            let node = this.node;
            this._controller.updateSize(cameraData.projection, cameraData.orthoHeight,
                cameraData.fov, cameraData.aspect, cameraData.near, cameraData.far);

            let worldPos = NodeUtils.getWorldPosition3D(node);
            let worldRot = NodeUtils.getWorldRotation3D(node);

            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);
        }
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = CameraComponentGizmo;
