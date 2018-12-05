'use strict';
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let BoxController = require('../controller/box-controller');
let Gizmo = require('../gizmo-base');
const { getBoudingBox } = require('../../../utils/engine');

const vec3 = cc.vmath.vec3;

class ModelComponentGizmo extends Gizmo {
    init() {
        this._degreeToRadianFactor = Math.PI / 180;
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
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        this._controller = new BoxController(gizmoRoot);
    }

    updateControllerTransform() {
        this.updateControllerData();
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        // if (this.target instanceof cc.ModelComponent ||
        //     this.target instanceof cc.MeshRenderer) {
        let node = this.node;

        let boundingBox = getBoudingBox(this.target);
        if (boundingBox) {
            this._controller.show();
            let size = cc.v3();

            let worldScale = NodeUtils.getWorldScale3D(node);
            let worldPos = NodeUtils.getWorldPosition3D(node);
            let worldRot = NodeUtils.getWorldRotation3D(node);
            this._controller.setScale(worldScale);
            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);

            vec3.scale(size, boundingBox.halfExtents, 2);
            let center = cc.v3(boundingBox.center.x, boundingBox.center.y, boundingBox.center.z);
            this._controller.updateSize(center, size);
        } else {
            this._controller.hide();
        }
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = ModelComponentGizmo;
