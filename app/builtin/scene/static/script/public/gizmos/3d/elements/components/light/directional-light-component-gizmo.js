'use strict';
const Utils = require('../../../../utils');
const External = require('../../../../utils/external');
const NodeUtils = External.NodeUtils;
let DirectionLightController = require('../../controller/direction-light-controller');
let Gizmo = require('../../gizmo-base');

class DirectionalLightComponentGizmo extends Gizmo {
    init() {
        this._lightGizmoColor = new cc.Color(255, 255, 50);

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
        this._controller  = new DirectionLightController(gizmoRoot);
        this._controller.setColor(this._lightGizmoColor);
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }
    }

    onControllerMouseMove(/*event*/) {

        this.updateDataFromController();

        // update controller transform
        this.updateControllerData();
    }

    onControllerMouseUp() {

    }

    updateDataFromController() {

        if (this._controller.updated) {
            let node = this.node;
            // 发送节点修改消息
            Utils.onNodeChanged(node);
        }
    }

    updateControllerTransform() {
        let node = this.node;
        let worldRot = NodeUtils.getWorldRotation3D(node);
        let worldPos = NodeUtils.getWorldPosition3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }

    updateControllerData() {
        if (!this._isInited || this.target == null) {
            return;
        }

        this.updateControllerTransform();
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = DirectionalLightComponentGizmo;
