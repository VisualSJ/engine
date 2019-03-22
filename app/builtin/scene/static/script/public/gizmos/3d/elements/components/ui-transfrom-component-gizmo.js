'use strict';

const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let Gizmo = require('../gizmo-base');
let RectController = require('../controller/rectangle-controller');

class UITransformComponentGizmo extends Gizmo {
    init() {
        this.createController();
    }

    onShow() {
        this._controller.show();
        this.updateController();
    }

    onHide() {
        this._controller.hide();
        this.unregisterListeners(this.nodes);
    }

    createController() {
        this._controller = new RectController(this.getGizmoRoot());
        this._controller.setColor(new cc.Color(0, 153, 255));

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
    }

    onControllerMouseDown() {
    }

    onControllerMouseMove() {
    }

    onControllerMouseUp() {
    }

    onGizmoKeyDown(event) {
    }

    onGizmoKeyUp(event) {
    }

    updateControllerTransform() {
        if (!this._isInited || this.target == null) {
            return;
        }

        let node = this.node;

        let worldPos = NodeUtils.getWorldPosition3D(node);
        let worldRot = NodeUtils.getWorldRotation3D(node);
        let worldScale = NodeUtils.getWorldScale3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
        this._controller.setScale(worldScale);
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        let uiTransComp = this.target;
        if (uiTransComp) {
            let size = uiTransComp.contentSize;
            let anchor = uiTransComp.anchorPoint;
            let center = cc.v3();
            center.x = (0.5 - anchor.x) * size.width;
            center.y = (0.5 - anchor.y) * size.height;
            this._controller.updateSize(center, cc.v2(size.width, size.height));
        } else {
            this._controller.hide();
        }
    }

    updateController() {
        this.updateControllerTransform();
        this.updateControllerData();
    }

    onSubRegisterListeners(nodes) {
        this.registerListener(nodes, 'anchor-changed', this.onNodeTransformChanged);
        this.registerListener(nodes, 'size-changed', this.onNodeTransformChanged);
    }

    onSubUnregisterListeners(nodes) {
        this.unregisterListener(nodes, 'anchor-changed', this.onNodeTransformChanged);
        this.unregisterListener(nodes, 'size-changed', this.onNodeTransformChanged);
    }

    onTargetUpdate() {
        this.updateController();
    }

    onNodeChanged() {
        this.updateController();
    }
}

module.exports = UITransformComponentGizmo;
