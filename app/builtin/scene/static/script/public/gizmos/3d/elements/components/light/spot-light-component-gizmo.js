'use strict';
const Utils = require('../../../../utils');
const External = require('../../../../utils/external');
const NodeUtils = External.NodeUtils;
let SpotLightController = require('../../controller/cone-controller');
let QuadController = require('../../controller/quad-controller');
let Gizmo = require('../../gizmo-base');
let ControllerUtils = require('../../utils/controller-utils');
const { create3DNode, setMaterialProperty} = require('../../../../utils/engine');
const MathUtil = External.EditorMath;

class SpotLightComponentGizmo extends Gizmo {
    init() {
        this._lightGizmoColor = new cc.Color(255, 255, 50);
        this._lightCtrlHoverColor = new cc.Color(0, 255, 0);

        this._range = 0;
        this._angle = 0;
        this._baseSize = 0.5;
        this._glowSize = 0.4;

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
        let SpotLightGizmoRoot = create3DNode('SpotLightGizmo');
        SpotLightGizmoRoot.parent = gizmoRoot;
        this._controller  = new SpotLightController(SpotLightGizmoRoot);
        this._controller.setColor(this._lightGizmoColor);

        this._controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        this._controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        this._controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
        this._controller.editable = true;
        this._controller.hoverColor = this._lightCtrlHoverColor;

        this._sizeSphereCtrl = new QuadController(gizmoRoot, {
            effectName: 'editor/light',
            forwardPipeline: true,
            size: 4, // radius 1, plus 1 for the glowings
        });
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }

        this._range = this.target.range;
        this._angle = this.target.spotAngle;
    }

    onControllerMouseMove(/*event*/) {

        this.updateDataFromController();

        // update controller transform
        this.updateControllerData();
    }

    onControllerMouseUp() {

    }

    getConeRadius(angle, height) {
        let radius = Math.tan(angle / 2 * MathUtil.D2R) * height;

        return radius;
    }

    updateDataFromController() {

        if (this._controller.updated) {
            let node = this.node;

            let detlaRadius = this._controller.getDeltaRadius();
            let deltaHeight = this._controller.getDeltaHeight();

            let newHeight = this._range;
            if (deltaHeight !== 0) {
                newHeight = this._range + deltaHeight;
                newHeight = MathUtil.toPrecision(newHeight, 3);
                // clamp
                newHeight = Math.abs(newHeight);
                if (newHeight < 0.01) {
                    newHeight = 0.01;
                }
            }

            let newRadius = this.getConeRadius(this._angle, newHeight);
            let angle = this._angle;
            if (detlaRadius !== 0) {
                newRadius = this.getConeRadius(this._angle, newHeight) + detlaRadius;
                newRadius = Math.abs(newRadius);

                angle = Math.atan2(newRadius, newHeight) * 2;
                if (angle < MathUtil.D2R) {
                    angle = MathUtil.D2R;
                }
                angle = angle * MathUtil.R2D;
                angle = MathUtil.toPrecision(angle, 3);
            }

            this.target.spotAngle = angle;
            this.target.range = newHeight;

            // 发送节点修改消息
            Utils.broadcastMessage('scene:node-changed', node);
        }
    }

    updateControllerTransform() {
        let node = this.node;
        let worldRot = NodeUtils.getWorldRotation3D(node);
        let worldPos = NodeUtils.getWorldPosition3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
        this._sizeSphereCtrl.setPosition(worldPos);
    }

    updateControllerData() {
        if (!this._isInited || this.target == null) {
            return;
        }

        this._controller.checkEdit();
        let lightComp = this.target;
        let radius = this.getConeRadius(lightComp.spotAngle, lightComp.range);
        this._controller.updateSize(cc.v3(), radius, lightComp.range);

        let color = lightComp.color.clone();
        if (lightComp.useColorTemperature) {
            let colorTemperatureRGB = lightComp._light.colorTemperatureRGB;
            color.r *= colorTemperatureRGB.x;
            color.g *= colorTemperatureRGB.y;
            color.b *= colorTemperatureRGB.z;
        }

        let intensitySize = cc.v4();
        intensitySize.x = lightComp.luminance;
        intensitySize.y = this._glowSize;
        this._sizeSphereCtrl.setMaterialProperty('color', color);
        this._sizeSphereCtrl.setMaterialProperty('intensitySize', intensitySize);
        this._sizeSphereCtrl.updateSize(lightComp.size * 4);

        this.updateControllerTransform();
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = SpotLightComponentGizmo;
