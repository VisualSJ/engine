'use strict';
const Utils = require('../../../../utils');
const External = require('../../../../utils/external');
const NodeUtils = External.NodeUtils;
let SphereController = require('../../controller/sphere-controller');
let Gizmo = require('../../gizmo-base');
const MathUtil = External.EditorMath;
const vec3 = cc.vmath.vec3;
let tempVec3 = cc.v3();

class SphereColliderComponentGizmo extends Gizmo {
    init() {
        this._radius = 0;
        this._maxScale = 1;

        this.createController();
        this._isInited = true;
    }

    onShow() {
        this._controller.show();
        this.updateControllerData();
    }

    onHide() {
        this._controller.hide();
        let nodes = this.nodes;
        this.unregisterListeners(nodes);
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        this._controller = new SphereController(gizmoRoot);
        this._controller.setColor(cc.Color.GREEN);
        this._controller.editable = true;
        this._controller.hoverColor = cc.Color.YELLOW;
        //this._controller.setOpacity(150);
        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }

        let worldScale = NodeUtils.getWorldScale3D(this.node);
        this._maxScale = this.getMaxScale(worldScale);
        this._radius = this.target.radius;
    }

    onControllerMouseMove(/*event*/) {

        this.updateDataFromController();

        // update controller transform
        this.updateControllerData();
    }

    onControllerMouseUp() {

    }

    getMaxScale(inScale) {
        let maxScale = Math.max(inScale.x, inScale.y, inScale.z);

        return maxScale;
    }

    updateDataFromController() {

        if (this._controller.updated) {
            let deltaRadius = this._controller.getDeltaRadius();

            let newRadius = this._radius + deltaRadius / this._maxScale;
            newRadius = Math.abs(newRadius);
            newRadius = MathUtil.toPrecision(newRadius, 3);
            this.target.radius = newRadius;

            let node = this.node;
            // 发送节点修改消息
            Utils.onNodeChanged(node);
        }
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        if (this.target instanceof cc.SphereColliderComponent) {
            let node = this.node;

            this._controller.show();
            this._controller.checkEdit();

            let worldScale = NodeUtils.getWorldScale3D(node);
            let maxScale = this.getMaxScale(worldScale);
            let worldPos = NodeUtils.getWorldPosition3D(node);
            let worldRot = NodeUtils.getWorldRotation3D(node);
            this._controller.setScale(cc.v3(maxScale, maxScale, maxScale));
            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);

            this._controller.updateSize(this.target.center, this.target.radius);
        } else {
            this._controller.hide();
            console.error('target is not a cc.SphereColliderComponent');
        }
    }

    updateControllerTransform() {
        this.updateControllerData();
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = SphereColliderComponentGizmo;
