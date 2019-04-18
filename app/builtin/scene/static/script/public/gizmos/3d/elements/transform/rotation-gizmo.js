'use strict';

const vec3 = cc.vmath.vec3;
const quat = cc.vmath.quat;
const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const GizmoUtils = Utils.GizmoUtils;
let TransformGizmo = require('./transform-gizmo');
let RotationController = require('../controller/rotation-controller');
const TransformToolData = require('../../../utils/transform-tool-data');
const MathUtil = External.EditorMath;

const GizmoConfig = require('../../../gizmo-config');

class RotationGizmo extends TransformGizmo {
    init() {
        this._rotList = [];
        this._offsetList = [];
        this._center = cc.v2(0, 0);
        this._rotating = false;

        this._degreeToRadianFactor = Math.PI / 180;

        this.createController();
    }

    layer() {
        return 'foreground';
    }

    createController() {
        this._controller = new RotationController(this.getGizmoRoot());

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    onControllerMouseDown() {
        this._rotating = true;
        this._rotList = [];

        let topNodes = this.topNodes;

        for (let i = 0; i < topNodes.length; ++i) {

            if (GizmoConfig.isCreator2x && this._controller.is2D) {
                this._rotList.push(topNodes[i].angle);
            } else {
                let rot = NodeUtils.getWorldRotation3D(topNodes[i]);
                this._rotList.push(quat.clone(rot));
            }
        }

        if (TransformToolData.pivot === 'center') {
            this._center = GizmoUtils.getCenterWorldPos3D(this.target);
            this._offsetList.length = 0;
            for (let i = 0; i < topNodes.length; ++i) {
                let nodeWorldPos = NodeUtils.getWorldPosition3D(topNodes[i]);
                this._offsetList.push(nodeWorldPos.sub(this._center));
            }
        }

        Utils.requestPointerLock();
    }

    onControllerMouseMove(event) {
        this.updateDataFromController();

        // update controller transform
        this.updateControllerTransform();
    }

    onControllerMouseUp() {
        if (TransformToolData.pivot === 'center') {
            let worldPos = GizmoUtils.getCenterWorldPos3D(this.target);
            let worldRot = cc.quat(0, 0, 0, 1);
            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);
        }

        this._rotating = false;

        if (this._controller.updated) {
            this.commitChanges();
        }

        Utils.exitPointerLock();
    }

    onGizmoKeyDown(event) {
        if (!this.target) {
            return;
        }

        this._rotating = true;

        let keyCode = event.key.toLowerCase();

        if (keyCode !== 'arrowleft' &&
            keyCode !== 'arrowright' &&
            keyCode !== 'arrowup' &&
            keyCode !== 'arrowdown') {
            return;
        }

        let delta = event.shiftKey ? 10 : 1; // right and down
        if (keyCode === 'arrowright' || keyCode === 'arrowdown') {
            delta *= -1;
        }

        if (!this.keydownDelta) {
            this.keydownDelta = 0;
            let topNodes = this.topNodes;
            this._rotList = [];
            for (let i = 0; i < topNodes.length; ++i) {
                this._rotList.push(topNodes[i].angle);
            }
        }

        this.keydownDelta += delta;

        this.recordChanges();

        this.updateRotationByZDeltaAngle(this.keydownDelta);
        Utils.repaintEngine();
    }

    onGizmoKeyUp(event) {
        if (!this.target) {
            return;
        }

        let keyCode = event.key.toLowerCase();

        if (keyCode !== 'arrowleft' &&
            keyCode !== 'arrowright' &&
            keyCode !== 'arrowup' &&
            keyCode !== 'arrowdown') {
            return;
        }

        if (TransformToolData.pivot === 'center') {
            let worldPos = GizmoUtils.getCenterWorldPos3D(this.target);
            this._controller.setPosition(worldPos);
            this._controller.setRotation(cc.quat(0, 0, 0, 1));
        }

        this.keydownDelta = null;
        this._rotating = false;

        this.commitChanges();
    }

    updateDataFromController() {
        if (GizmoConfig.isCreator2x && this._controller.is2D) {
            this.updateDataFromController2D();
        } else {
            this.updateDataFromController3D();
        }
    }

    updateDataFromController3D() {
        if (this._controller.updated) {
            this.recordChanges();

            let i;
            let rot = cc.quat(0, 0, 0, 1);
            let deltaRotation = this._controller.getDeltaRotation();
            let topNodes = this.topNodes;

            if (TransformToolData.pivot === 'center') {
                for (i = 0; i < topNodes.length; ++i) {
                    let curNodeMouseDownRot = this._rotList[i];

                    if (curNodeMouseDownRot == null) {
                        return;
                    }

                    if (TransformToolData.coordinate === 'global') {
                        quat.mul(rot, deltaRotation, curNodeMouseDownRot);
                    } else {
                        quat.mul(rot, curNodeMouseDownRot, deltaRotation);
                    }

                    let offsetPos = cc.v3();
                    vec3.transformQuat(offsetPos, this._offsetList[i], deltaRotation);
                    NodeUtils.setWorldPosition3D(topNodes[i], this._center.add(offsetPos));
                    NodeUtils.setWorldRotation3D(topNodes[i], rot);
                    // 发送节点修改消息
                    Utils.broadcastMessage('scene:change-node', topNodes[i], 'rotation');
                }
            } else {
                for (i = 0; i < topNodes.length; ++i) {
                    if (TransformToolData.coordinate === 'global') {
                        quat.mul(rot, deltaRotation, this._rotList[i]);
                    } else {
                        quat.mul(rot, this._rotList[i], deltaRotation);
                    }

                    NodeUtils.setWorldRotation3D(topNodes[i], rot);
                    // 发送节点修改消息
                    Utils.broadcastMessage('scene:change-node', topNodes[i], 'rotation');
                }
            }
        }
    }

    updateDataFromController2D() {
        if (this._controller.updated) {
            this.recordChanges();

            let zDeltaAngle = this._controller.getZDeltaAngle();
            this.updateRotationByZDeltaAngle(zDeltaAngle);
        }
    }

    updateRotationByZDeltaAngle(zDeltaAngle) {
        let i;
        zDeltaAngle = MathUtil.toPrecision(zDeltaAngle, 3);
        let deltaRotation = cc.quat();
        let topNodes = this.topNodes;

        if (TransformToolData.pivot === 'center') {
            for (i = 0; i < topNodes.length; ++i) {
                let curNodeMouseDownRot = this._rotList[i];

                if (curNodeMouseDownRot == null) {
                    return;
                }

                let newAngle = curNodeMouseDownRot + zDeltaAngle;
                topNodes[i].angle = newAngle;
                quat.fromEuler(deltaRotation, 0, 0, zDeltaAngle);
                let offsetPos = cc.v3();
                vec3.transformQuat(offsetPos, this._offsetList[i], deltaRotation);
                NodeUtils.setWorldPosition3D(topNodes[i], this._center.add(offsetPos));
                //NodeUtils.setWorldRotation3D(topNodes[i], rot);
                // 发送节点修改消息
                Utils.broadcastMessage('scene:change-node', topNodes[i], 'rotation');
            }
        } else {
            for (i = 0; i < topNodes.length; ++i) {
                let newAngle = this._rotList[i] + zDeltaAngle;
                topNodes[i].angle = newAngle;

                // 发送节点修改消息
                Utils.broadcastMessage('scene:change-node', topNodes[i], 'rotation');
            }
        }
    }

    updateControllerTransform() {
        let node = this.node;
        let worldPos;
        let worldRot = cc.quat(0, 0, 0, 1);

        if (TransformToolData.pivot === 'center') {
            if (this._rotating) {
                return;
            }

            worldPos = GizmoUtils.getCenterWorldPos3D(this.target);
        } else {
            worldPos = NodeUtils.getWorldPosition3D(node);

        }

        if (TransformToolData.coordinate === 'global') {
            worldRot = this._controller.getDeltaRotation();
        } else {
            worldRot = NodeUtils.getWorldRotation3D(node);
        }

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }
}

module.exports = RotationGizmo;
