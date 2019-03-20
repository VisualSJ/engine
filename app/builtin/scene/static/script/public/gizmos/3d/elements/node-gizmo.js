'use strict';
const Utils = require('../../utils');
const External = require('../../utils/external');
const NodeUtils = External.NodeUtils;
let Gizmo = require('./gizmo-base');
const { getCameraData, setCameraData } = require('../../utils/engine');
let RectangleController = require('./controller/rectangle-controller');
let IconController = require('./controller/icon-controller');
const MathUtil = External.EditorMath;
const vec3 = cc.vmath.vec3;

// 节点的Gizmo，用于一些常驻的Gizmo显示
class NodeGizmo extends Gizmo {
    init() {
        this._controllers = {};
        this._isInited = true;

        this._rectControllerPool = [];
        this._iconControllerPool = [];
    }

    onShow() {
        this.updateController();
    }

    destroyAllControllers() {
        Object.keys(this._controllers).forEach((key) => {
            let controller = this._controllers[key];
            controller.hide();
        });

        this._controllers = [];
    }

    onHide() {
        this.destroyAllControllers();

        let nodes = this.nodes;
        this.unregisterListeners(nodes);
    }

    getControllerByComp(component) {
        let controller = this._controllers[component.uuid];

        if (!controller) {
            controller = this.createController(component);
            if (controller) {
                this._controllers[component.uuid] = controller;
            }
        }

        return controller;
    }

    spawnRectController(root) {
        let controller = null;
        for (let i = 0; i < this._rectControllerPool.length; i++) {
            controller = this._rectControllerPool[i];
            if (!controller.active) {
                return controller;
            }
        }

        controller = new RectangleController(root);
        this._rectControllerPool.push(controller);

        return controller;
    }

    spawnIconController(root) {
        let controller = null;
        for (let i = 0; i < this._iconControllerPool.length; i++) {
            controller = this._iconControllerPool[i];
            if (!controller.active) {
                return controller;
            }
        }

        controller = new IconController(root);
        this._iconControllerPool.push(controller);

        return controller;
    }

    createController(component) {
        let gizmoRoot = this.getGizmoRoot();
        let controller = null;

        if (component instanceof cc.CanvasComponent) {
            controller = this.spawnRectController(gizmoRoot);
        } else if (component instanceof cc.ParticleSystemComponent) {
            controller = this.spawnIconController(gizmoRoot);
            controller.setTextureByUuid('55052bc6-9909-43c1-b2fc-8818060fb069@particle-system');
        } else if (component instanceof cc.DirectionalLightComponent) {
            controller = this.spawnIconController(gizmoRoot);
            controller.setTextureByUuid('9cb543ba-d152-4809-8a44-8e7bd5712123@directional-light');
        } else if (component instanceof cc.SphereLightComponent) {
            controller = this.spawnIconController(gizmoRoot);
            controller.setTextureByUuid('c78f78a5-3553-4d1f-ad3b-177fe55af68b@sphere-light');
        } else if (component instanceof cc.SpotLightComponent) {
            controller = this.spawnIconController(gizmoRoot);
            controller.setTextureByUuid('191b676f-175b-41fa-8283-ac539875bfd8@spot-light');
        } else if (component instanceof cc.CameraComponent) {
            controller = this.spawnIconController(gizmoRoot);
            controller.setTextureByUuid('bd373594-df84-486d-a34a-19d09ddaa973@camera');
        }

        if (controller) {
            controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
            controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
            controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
        }

        return controller;
    }

    onControllerMouseDown() {

    }

    onControllerMouseMove(/*event*/) {

    }

    onControllerMouseUp() {
        let node = this.node;
        if (node) {
            Utils.select(this.node.uuid);
        }
    }

    updateControllerTransform() {
        if (!this._isInited || this.target == null) {
            return;
        }

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
            this.destroyAllControllers();

            let comps = node._components;
            for (let i = 0; i < comps.length; i++) {
                let comp = comps[i];
                let controller = this.getControllerByComp(comp);
                if (controller) {
                    if (comp instanceof cc.CanvasComponent) {
                        let uiTransComp = node.getComponent(cc.UITransformComponent);
                        if (uiTransComp) {
                            let size = uiTransComp.contentSize;
                            controller.show();
                            controller.updateSize(cc.v3(), cc.v2(size.width, size.height));
                        }
                    } else {
                        controller.show();
                    }
                    break;
                }
            }
        }

    }

    updateController() {
        this.updateControllerData();
        this.updateControllerTransform();
    }

    onTargetUpdate() {
        this.updateController();
    }

    onNodeChanged() {
        this.updateController();
    }
}

module.exports = NodeGizmo;
