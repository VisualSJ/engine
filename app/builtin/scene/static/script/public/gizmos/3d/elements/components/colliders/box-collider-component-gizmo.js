'use strict';
const Utils = require('../../../../utils');
const External = require('../../../../utils/external');
const NodeUtils = External.NodeUtils;
let BoxController = require('../../controller/box-controller');
let Gizmo = require('../../gizmo-base');

const vec3 = cc.vmath.vec3;
let tempVec3 = cc.v3();

class BoxColliderComponentGizmo extends Gizmo {
    init() {
        this._size = cc.v3();
        this._scale = cc.v3();

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
        this._controller = new BoxController(gizmoRoot);
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

        this._size = this.target.size.clone();
        this._scale = NodeUtils.getWorldScale3D(this.node);
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
            let deltaSize = this._controller.getDeltaSize();
            vec3.div(deltaSize, deltaSize, this._scale);
            vec3.scale(deltaSize, deltaSize, 2);
            let newSize = vec3.add(tempVec3, this._size, deltaSize);
            Utils.clampSize(newSize);
            this.target.size = newSize;

            let node = this.node;
            // 发送节点修改消息
            Utils.broadcastMessage('scene:change-node', node);
        }
    }

    updateControllerTransform() {
        this.updateControllerData();
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        if (this.target instanceof cc.BoxColliderComponent) {
            let node = this.node;

            this._controller.show();
            this._controller.checkEdit();

            let worldScale = NodeUtils.getWorldScale3D(node);
            let worldPos = NodeUtils.getWorldPosition3D(node);
            let worldRot = NodeUtils.getWorldRotation3D(node);
            this._controller.setScale(worldScale);
            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);

            this._controller.updateSize(this.target.center, this.target.size);
        } else {
            this._controller.hide();
            console.error('target is not a cc.BoxColliderComponent');
        }
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = BoxColliderComponentGizmo;
