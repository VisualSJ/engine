'use strict';
const Utils = require('../../../../utils');
const External = require('../../../../utils/external');
const NodeUtils = External.NodeUtils;
let SphereLightController = require('../../controller/sphere-controller');
let Gizmo = require('../../gizmo-base');
let ControllerUtils = require('../../utils/controller-utils');
const { create3DNode, setMaterialProperty} = require('../../../../utils/engine');
const MathUtil = External.EditorMath;

class SphereLightComponentGizmo extends Gizmo {
    init() {
        this._lightGizmoColor = new cc.Color(255, 255, 50);
        this._lightCtrlHoverColor = new cc.Color(0, 255, 0);

        this._range = 0;
        this._baseSize = 1;

        this.createController();
        this._isInited = true;
    }

    onShow() {
        this._controller.show();
        this._sizeSphere.active = true;
        this.updateControllerData();
    }

    onHide() {
        this._controller.hide();
        this._sizeSphere.active = false;
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

        this._sizeSphere = ControllerUtils.sphere(cc.v3(), this._baseSize,
            this._lightGizmoColor, {effectName: '__editor-light', forwardPipeline: true});
        this._sizeSphere.parent = SphereLightGizmoRoot;
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
        this._sizeSphere.setPosition(worldPos);
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
            color.r *= colorTemperatureRGB.r;
            color.g *= colorTemperatureRGB.g;
            color.b *= colorTemperatureRGB.b;
        }

        let intensitySize = cc.v4();
        intensitySize.x = lightComp.luminance * cc.director.root.pipeline.lightMeterScale;
        intensitySize.y = lightComp.size;
        setMaterialProperty(this._sizeSphere, 'color', color);
        setMaterialProperty(this._sizeSphere, 'intensitySize', intensitySize);

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
