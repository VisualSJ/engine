'use strict';

const vec3 = cc.vmath.vec3;
const quat = cc.vmath.quat;
const NodeUtils = require('../../../../utils/node');
let Gizmo = require('../gizmo');
let RotationController = require('../controller/rotation-controller');
const GizmoManager = require('../../index');

class RotationGizmo extends Gizmo {
    init() {
        this._rotList = [];
        this._offsetList = [];
        this._center = cc.v2(0, 0);
        this._rotating = false;

        this._degreeToRadianFactor = Math.PI / 180;
    }

    layer() {
        return 'foreground';
    }

    onCreateController() {
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
            let rot = NodeUtils.getWorldRotation3D(topNodes[i]);
            this._rotList.push(quat.clone(rot));
        }

        if (GizmoManager.pivot === 'center') {
            this._center = Editor.GizmosUtils.getCenterWorldPos3D(this.target);
            this._offsetList.length = 0;
            for (let i = 0; i < topNodes.length; ++i) {
                let nodeWorldPos = NodeUtils.getWorldPosition3D(topNodes[i]);
                this._offsetList.push(nodeWorldPos.sub(this._center));
            }
        }
    }

    onControllerMouseMove(event) {
        if (this._controller.updated) {
            // this.target.forEach(node => {
            //     _Scene.Undo.recordNode(node.uuid);
            // });

            let i;
            let rot = cc.quat(0, 0, 0, 1);
            let deltaRotation = this._controller.getDeltaRotation();
            let topNodes = this.topNodes;

            if (GizmoManager.pivot === 'center') {
                for (i = 0; i < topNodes.length; ++i) {
                    let curNodeMouseDownRot = this._rotList[i];

                    if (curNodeMouseDownRot == null) {
                        return;
                    }

                    if (GizmoManager.coordinate === 'global') {
                        quat.mul(rot, deltaRotation, curNodeMouseDownRot);
                    } else {
                        quat.mul(rot, curNodeMouseDownRot, deltaRotation);
                    }

                    let offsetPos = cc.v3();
                    vec3.transformQuat(offsetPos, this._offsetList[i], deltaRotation);
                    NodeUtils.setWorldPosition3D(topNodes[i], this._center.add(offsetPos));
                    NodeUtils.setWorldRotation3D(topNodes[i], rot);
                    // 发送节点修改消息
                    Manager.Ipc.send('broadcast', 'scene:node-changed', topNodes[i].uuid);
                }
            } else {
                for (i = 0; i < topNodes.length; ++i) {
                    if (GizmoManager.coordinate === 'global') {
                        quat.mul(rot, deltaRotation, this._rotList[i]);
                    } else {
                        quat.mul(rot, this._rotList[i], deltaRotation);
                    }

                    NodeUtils.setWorldRotation3D(topNodes[i], rot);
                    // 发送节点修改消息
                    Manager.Ipc.send('broadcast', 'scene:node-changed', topNodes[i].uuid);
                }
            }
        }

        // update controller transform
        this.updateControllerTransform();
    }

    onControllerMouseUp() {
        if (GizmoManager.pivot === 'center') {
            let worldPos = Editor.GizmosUtils.getCenterWorldPos3D(this.target);
            let worldRot = cc.quat(0, 0, 0, 1);
            this._controller.setPosition(worldPos);
            this._controller.setRotation(worldRot);
        }

        this._rotating = false;

        if (this._controller.updated) {
            this.commitChanges();
        }
    }

    onGizmoKeyDown(event) {
        if (!this.target) {
            return;
        }

        this._rotating = true;

        let keyCode = event.key.toLowerCase();

        if (keyCode !== 'left' &&
            keyCode !== 'right' &&
            keyCode !== 'up' &&
            keyCode !== 'down') {
            return;
        }

        let delta = event.shiftKey ? 10 : 1; // right and down
        if (keyCode === 'right' || keyCode === 'down') {
            delta *= -1;
        }

        if (!this.keydownDelta) {
            this.keydownDelta = 0;
        }

        this.keydownDelta += delta;

        this.recordChanges();

        let topNodes = this.topNodes;
        let curNodeRot = cc.quat(0, 0, 0, 1);
        let deltaRotation = cc.quat(0, 0, 0, 1);
        let rot = cc.quat(0, 0, 0, 1);
        let curNodePos;
        quat.fromAxisAngle(deltaRotation, cc.v3(0, 0, 1), delta * this._degreeToRadianFactor);

        if (GizmoManager.pivot === 'center') {
            let center = Editor.GizmosUtils.getCenterWorldPos3D(this.target);

            for (let i = 0; i < topNodes.length; ++i) {
                let node = topNodes[i];
                node.getRotation(curNodeRot);

                if (GizmoManager.coordinate === 'global') {
                    quat.mul(rot, deltaRotation, curNodeRot);
                } else {
                    quat.mul(rot, curNodeRot, deltaRotation);
                }

                let offsetPos = NodeUtils.getWorldPosition3D(node).sub(center);
                vec3.transformQuat(offsetPos, offsetPos, deltaRotation);
                curNodePos = center.add(offsetPos);
                NodeUtils.setWorldPosition3D(node, curNodePos);
                NodeUtils.setWorldRotation3D(node, rot);
            }

            // rotate controller
            quat.fromAxisAngle(rot, cc.v3(0, 0, 1), this.keydownDelta * this._degreeToRadianFactor);
            this._controller.setRotation(rot);
        } else {
            for (let i = 0; i < topNodes.length; ++i) {
                topNodes[i].getRotation(curNodeRot);
                if (GizmoManager.coordinate === 'global') {
                    quat.mul(rot, deltaRotation, curNodeRot);
                } else {
                    quat.mul(rot, curNodeRot, deltaRotation);
                }

                NodeUtils.setWorldRotation3D(topNodes[i], rot);
            }
        }
    }

    onGizmoKeyUp(event) {
        if (!this.target) {
            return;
        }

        let keyCode = event.key.toLowerCase();

        if (keyCode !== 'left' &&
            keyCode !== 'right' &&
            keyCode !== 'up' &&
            keyCode !== 'down') {
            return;
        }

        if (GizmoManager.pivot === 'center') {
            let worldPos = Editor.GizmosUtils.getCenterWorldPos3D(this.target);
            this._controller.setPosition(worldPos);
            this._controller.setRotation(cc.quat(0, 0, 0, 1));
        }

        this.keydownDelta = null;
        this._rotating = false;

        this.commitChanges();
    }

    onKeyDown(event) {

    }

    onKeyUp(event) {

    }

    visible() {
        return true;
    }

    dirty() {
        return true;
    }

    onUpdate() {

    }

    updateControllerTransform() {
        let node = this.node;
        let worldPos;
        let worldRot = cc.quat(0, 0, 0, 1);

        if (GizmoManager.pivot === 'center') {
            if (this._rotating) {
                return;
            }

            worldPos = Editor.GizmosUtils.getCenterWorldPos3D(this.target);
        } else {
            worldPos = NodeUtils.getWorldPosition3D(node);

            if (GizmoManager.coordinate === 'global') {
                worldRot = this._controller.getDeltaRotation();
            } else {
                worldRot = NodeUtils.getWorldRotation3D(node);
            }
        }

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }
}

module.exports = RotationGizmo;
