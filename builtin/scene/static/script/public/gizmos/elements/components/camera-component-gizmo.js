const NodeUtils = require('../../../../utils/node');
let FrustumController = require('../controller/frustum-controller');
let Gizmo = require('../gizmo-base');
const { create3DNode } = require('../../engine');
let aabb = require('../../../../utils/aabb');

const vec3 = cc.vmath.vec3;

class CameraComponentGizmo extends Gizmo {
    init() {
        this.createController();
    }

    onShow() {
        this._controller.show();
        this.updateControllerTransform();
    }

    onHide() {
        this._controller.hide();
        let nodes = this.nodes;
        this.unRegisterNodeEvents(nodes, this.onNodeChanged, this);
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

        if (this.target instanceof cc.CameraComponent) {

            let node = this.node;
            let camComp = this.target;
            let aspect = cc.winSize.width / cc.winSize.height;
            this._controller.updateSize(camComp.fov, aspect, camComp.near, camComp.far);

            let worldPos = NodeUtils.getWorldPosition3D(node);
            let worldRot = NodeUtils.getWorldRotation3D(node);

            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);
        } else {
            console.error('target is not a cc.CameraComponent');
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
