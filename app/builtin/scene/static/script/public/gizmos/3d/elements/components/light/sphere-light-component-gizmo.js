'use strict';
const Utils = require('../../../../utils');
const External = require('../../../../utils/external');
const NodeUtils = External.NodeUtils;
let SphereLightController = require('../../controller/sphere-controller');
let QuadController = require('../../controller/quad-controller');
let Gizmo = require('../../gizmo-base');
const { create3DNode } = require('../../../../utils/engine');
const MathUtil = External.EditorMath;

class SphereLightComponentGizmo extends Gizmo {
    init() {
        this._lightGizmoColor = new cc.Color(255, 255, 50);
        this._lightCtrlHoverColor = new cc.Color(0, 255, 0);

        this._range = 0;

        this.createController();
        this._isInited = true;
    }

    onShow() {
        this._controller.show();
        this._sizeSphereCtrl.show();
        this.updateControllerData();
    }

    onHide() {
        this._controller.hide();
        this._sizeSphereCtrl.hide();
        let nodes = this.nodes;
        this.unregisterListeners(nodes);
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        let SphereLightGizmoRoot = create3DNode('SphereLightGizmo');
        SphereLightGizmoRoot.parent = gizmoRoot;
        this._controller  = new SphereLightController(SphereLightGizmoRoot);
        this._controller.setColor(this._lightGizmoColor);

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
        this._controller.editable = true;
        this._controller.hoverColor = this._lightCtrlHoverColor;

        this._sizeSphereCtrl = new QuadController(gizmoRoot, {effectName: 'editor/light', forwardPipeline: true});
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }

        this._range = this.target.range;
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

            let deltaRange = this._controller.getDeltaRadius();
            let newRange = this._range + deltaRange;
            newRange = MathUtil.toPrecision(newRange, 3);
            newRange = Math.abs(newRange);
            this.target.range = newRange;

            // 发送节点修改消息
            Utils.broadcastMessage('scene:node-changed', node);
        }
    }

    updateControllerTransform() {
        let node = this.node;
        let worldPos = NodeUtils.getWorldPosition3D(node);

        this._controller.setPosition(worldPos);
        this._sizeSphereCtrl.setPosition(worldPos);
    }

    updateControllerData() {
        if (!this._isInited || this.target == null) {
            return;
        }

        this._controller.checkEdit();
        let lightComp = this.target;
        this._controller.radius = lightComp.range;

        let color = lightComp.color.clone();

        if (lightComp.useColorTemperature) {
            let colorTemperatureRGB = lightComp._light.colorTemperatureRGB;
            color.r *= colorTemperatureRGB.x;
            color.g *= colorTemperatureRGB.y;
            color.b *= colorTemperatureRGB.z;
        }

        let intensitySize = cc.v4();
        intensitySize.x = lightComp.luminance;
        intensitySize.y = lightComp.size;
        this._sizeSphereCtrl.setMaterialProperty('color', color);
        this._sizeSphereCtrl.setMaterialProperty('intensitySize', intensitySize);
        this._sizeSphereCtrl.updateSize(lightComp.size * 2);

        this.updateControllerTransform();
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = SphereLightComponentGizmo;
