'use strict';
const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let FrustumController = require('../controller/frustum-controller');
let Gizmo = require('../gizmo-base');
const { getCameraData, setCameraData } = require('../../../utils/engine');
const MathUtil = External.EditorMath;
const vec3 = cc.vmath.vec3;

class CameraComponentGizmo extends Gizmo {
    init() {

        // for edit
        this._fov = 0;
        this._near = 0;
        this._far = 0;
        this._aspect = 0;
        this._farHalfWidth = 0;
        this._farHalfHeight = 0;

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
        this._controller = new FrustumController(gizmoRoot);
        this._controller.editable = true;
        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }

        let cameraData = getCameraData(this.target);

        this._fov = cameraData.fov;
        this._near = cameraData.near;
        this._far = cameraData.far;
        this._aspect = cameraData.aspect;
        this._farHalfHeight = Math.tan(MathUtil.deg2rad(this._fov / 2)) * this._far;
        this._farHalfWidth = this._farHalfHeight * this._aspect;
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
            let deltaWidth = this._controller.getDeltaWidth();
            let deltaHeight = this._controller.getDeltaHeight();
            let deltaDistance = this._controller.getDeltaDistance();

            let newHalfHeight = this._farHalfHeight;
            if (deltaWidth !== 0) {
                let newHalfWidth = this._farHalfWidth + deltaWidth;
                newHalfHeight = newHalfWidth / this._aspect;
            }

            if (deltaHeight !== 0) {
                newHalfHeight = this._farHalfHeight + deltaHeight;
            }

            newHalfHeight = Math.abs(newHalfHeight);
            let angle = this._fov;
            if (newHalfHeight !== this._farHalfHeight) {
                angle = Math.atan2(newHalfHeight, this._far) * 2;
                if (angle < MathUtil.D2R) {
                    angle = MathUtil.D2R;
                }
                angle = angle * MathUtil.R2D;
                angle = MathUtil.toPrecision(angle, 3);
            }

            let newFar = this._far;
            if (deltaDistance !== 0) {
                newFar = this._far + deltaDistance;
                newFar = Math.abs(newFar);
                if (newFar < this._near) {
                    newFar = this._near + 0.01;
                }
                newFar = MathUtil.toPrecision(newFar, 3);
            }

            setCameraData(this.target, {fov: angle, far: newFar});

            let node = this.node;
            // 发送节点修改消息
            Utils.onNodeChanged(node);
        }
    }

    updateControllerTransform() {
        let node = this.node;
        let worldPos = NodeUtils.getWorldPosition3D(node);
        let worldRot = NodeUtils.getWorldRotation3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        let cameraData = getCameraData(this.target);
        if (cameraData) {
            this._controller.checkEdit();
            this._controller.updateSize(cameraData.projection, cameraData.orthoHeight,
                cameraData.fov, cameraData.aspect, cameraData.near, cameraData.far);

            this.updateControllerTransform();
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
