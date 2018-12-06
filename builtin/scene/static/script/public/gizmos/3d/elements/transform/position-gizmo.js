'use strict';
const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const GizmoUtils = Utils.GizmoUtils;
let PositionController = require('../controller/position-controller');
let TransformGizmo = require('./transform-gizmo');
const TransformToolData = require('../../../utils/transform-tool-data');
class PositionGizmo extends TransformGizmo {
    init() {
        this.nodesWorldPosList = [];

        this.createController();
    }

    layer() {
        return 'foreground';
    }

    createController() {
        this._controller = new PositionController(this.getGizmoRoot());

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    onControllerMouseDown() {
        this.nodesWorldPosList.length = 0;
        let topNodes = this.topNodes;
        for (let i = 0; i < topNodes.length; ++i) {
            this.nodesWorldPosList.push(NodeUtils.getWorldPosition3D(topNodes[i]));
        }
    }

    onControllerMouseMove(/*event*/) {
        this.updateDataFromController();

        // update controller transform
        this.updateControllerTransform();
    }

    onControllerMouseUp() {
        if (this._controller.updated) {
            this.commitChanges();
        }
    }

    onGizmoKeyDown(event) {
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

        let offset = event.shiftKey ? 10 : 1;

        let dif = cc.v3();
        if (keyCode === 'arrowleft') {
            dif.x = -offset;
        } else if (keyCode === 'arrowright') {
            dif.x = offset;
        } else if (keyCode === 'arrowup') {
            dif.y = offset;
        } else if (keyCode === 'arrowdown') {
            dif.y = -offset;
        }

        this.recordChanges();

        let curPos = cc.v3();
        this.topNodes.forEach((node) => {
            node.getPosition(curPos);
            curPos = curPos.add(dif);
            node.setPosition(curPos.x, curPos.y, curPos.z);
            Utils.broadcastMessage('scene:node-changed', node);
        });

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

        this.commitChanges();
    }

    updateDataFromController() {
        if (this._controller.updated) {
            this.recordChanges();

            let deltaPos = this._controller.getDeltaPosition();
            let topNodes = this.topNodes;
            let curNodePos;
            for (let i = 0; i < this.nodesWorldPosList.length; ++i) {
                curNodePos = this.nodesWorldPosList[i].add(deltaPos);
                NodeUtils.setWorldPosition3D(topNodes[i], curNodePos);

                // 发送节点修改消息
                Utils.broadcastMessage('scene:node-changed', topNodes[i]);
            }
        }
    }

    // 由于inspect之类的地方也会修改位置旋转等，所以暂时在update里调用可以确保位置一直是正确的，更好的
    // 作法应该是在各种引起Node的Transform的变化的地方发送一个消息来通知Gizmo的Trasform更新。
    updateControllerTransform() {
        let node = this.node;
        let worldPos;
        let worldRot = cc.quat(0, 0, 0, 1);
        if (TransformToolData.pivot === 'center') {
            worldPos = GizmoUtils.getCenterWorldPos3D(this.target);
        } else {
            worldPos = NodeUtils.getWorldPosition3D(node);
        }

        if (TransformToolData.coordinate !== 'global') {
            worldRot = NodeUtils.getWorldRotation3D(node);
        }

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }
}

module.exports = PositionGizmo;
