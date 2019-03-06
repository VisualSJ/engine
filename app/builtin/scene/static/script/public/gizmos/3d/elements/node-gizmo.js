'use strict';
const Utils = require('../../utils');
const External = require('../../utils/external');
const NodeUtils = External.NodeUtils;
let Gizmo = require('./gizmo-base');
const { getCameraData, setCameraData } = require('../../utils/engine');
let RectangleController = require('./controller/rectangle-controller');
const MathUtil = External.EditorMath;
const vec3 = cc.vmath.vec3;

// 节点的Gizmo，用于一些常驻的Gizmo显示
class NodeGizmo extends Gizmo {
    init() {
        this._controllers = {};
        this.createController();
        this._isInited = true;
    }

    onShow() {
        this.updateControllerData();
    }

    onHide() {
        Object.keys(this._controllers).forEach((key) => {
            let controller = this._controllers[key];
            controller.hide();
        });
        let nodes = this.nodes;
        this.unregisterListeners(nodes);
    }

    createController() {
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }

    }

    onControllerMouseMove(/*event*/) {

    }

    onControllerMouseUp() {

    }

    updateControllerTransform() {
        let node = this.node;
        let worldPos = NodeUtils.getWorldPosition3D(node);
        let worldRot = NodeUtils.getWorldRotation3D(node);

        Object.keys(this._controllers).forEach((key) => {
            let controller = this._controllers[key];
            controller.setPosition(worldPos);
            controller.setRotation(worldRot);
        });
    }

    updateControllerData() {
        if (!this._isInited || this.target == null) {
            return;
        }

        let node = this.node;
        if (node) {
            node._components.forEach((component) => {
                if (component instanceof cc.CanvasComponent) {
                    let uiTransComp = node.getComponent(cc.UITransformComponent);
                    if (uiTransComp) {
                        let canvasCtrl = this._controllers[component.uuid];
                        if (!canvasCtrl) {
                            canvasCtrl = new RectangleController(this.getGizmoRoot());
                            this._controllers[component.uuid] = canvasCtrl;
                        }
                        let size = uiTransComp.contentSize;
                        canvasCtrl.show();
                        canvasCtrl.updateSize(cc.v3(), cc.v2(size.width, size.height));
                    }
                }
            });
        }

    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}

module.exports = NodeGizmo;
