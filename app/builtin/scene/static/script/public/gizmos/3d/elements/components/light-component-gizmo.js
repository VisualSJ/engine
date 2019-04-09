'use strict';
const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let DirectionLightController = require('../controller/direction-light-controller');
let SphereLightController = require('../controller/sphere-controller');
let SpotLightController = require('../controller/cone-controller');
let Gizmo = require('../gizmo-base');
let ControllerUtils = require('../utils/controller-utils');
const { create3DNode, getLightData, setLightData, LightType} = require('../../../utils/engine');
const MathUtil = External.EditorMath;

class LightComponentGizmo extends Gizmo {
    init() {
        this.Direction = LightType.DIRECTIONAL;
        this.Sphere = LightType.SPHERE;
        this.Spot = LightType.SPOT;
        this._curLightType = this.Direction; // 0:direction, 1:sphere, 2:spot

        this._sphereLightRange = 0;
        this._spotAngle = 0;
        this._spotLightHeight = 0;
        this._lightGizmoColor = new cc.Color(255, 255, 50);
        this._lightCtrlHoverColor = new cc.Color(0, 255, 0);

        this.createController();
        this._isInited = true;
    }

    onShow() {
        this.updateControllerData();
    }

    onHide() {
        this._activeController.hide();
        let nodes = this.nodes;
        this.unregisterListeners(nodes);
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        let LightGizmoRoot = create3DNode('LightGizmo');
        LightGizmoRoot.parent = gizmoRoot;

        this._lightController = [];
        this._lightController[this.Direction] = new DirectionLightController(LightGizmoRoot);
        this._lightController[this.Direction].setColor(this._lightGizmoColor);

        // sphere light controller
        let sphereLightCtrl = new SphereLightController(LightGizmoRoot);
        sphereLightCtrl.setColor(this._lightGizmoColor);
        this._lightController[this.Sphere] = sphereLightCtrl;
        sphereLightCtrl.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        sphereLightCtrl.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        sphereLightCtrl.onControllerMouseUp = this.onControllerMouseUp.bind(this);
        sphereLightCtrl.editable = true;
        sphereLightCtrl.hoverColor = this._lightCtrlHoverColor;

        let spotLightCtrl = new SpotLightController(LightGizmoRoot);
        this._lightController[this.Spot] = spotLightCtrl;
        spotLightCtrl.setColor(this._lightGizmoColor);
        spotLightCtrl.onControllerMouseDown = this.onControllerMouseDown.bind(this);
        spotLightCtrl.onControllerMouseMove = this.onControllerMouseMove.bind(this);
        spotLightCtrl.onControllerMouseUp = this.onControllerMouseUp.bind(this);
        spotLightCtrl.editable = true;
        spotLightCtrl.hoverColor = this._lightCtrlHoverColor;

        this._activeController = this._lightController[this._curLightType];
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }

        let lightData = getLightData(this.target);

        switch (this._curLightType) {
            case this.Direction:
                break;
            case this.Sphere:
                this._sphereLightRange = lightData.range;
                break;
            case this.Spot:
                this._spotLightHeight = lightData.range;
                this._spotAngle = lightData.spotAngle;
                break;
        }
    }

    onControllerMouseMove(/*event*/) {

        this.updateDataFromController();

        // update controller transform
        this.updateControllerData();
    }

    onControllerMouseUp() {

    }

    updateDataFromController() {

        if (this._activeController.updated) {
            let node = this.node;
            switch (this._curLightType) {
                case this.Direction:
                    break;
                case this.Sphere:
                    let deltaRange = this._activeController.getDeltaRadius();
                    let newRange = this._sphereLightRange + deltaRange;
                    newRange = MathUtil.toPrecision(newRange, 3);
                    newRange = Math.abs(newRange);
                    setLightData(this.target, {range: newRange});
                    break;
                case this.Spot:
                    let detlaRadius = this._activeController.getDeltaRadius();
                    let deltaHeight = this._activeController.getDeltaHeight();

                    let newHeight = this._spotLightHeight;
                    if (deltaHeight !== 0) {
                        newHeight = this._spotLightHeight + deltaHeight;
                        newHeight = MathUtil.toPrecision(newHeight, 3);
                        // clamp
                        newHeight = Math.abs(newHeight);
                        if (newHeight < 0.01) {
                            newHeight = 0.01;
                        }
                    }

                    let newRadius = this.getConeRadius(this._spotAngle, newHeight);
                    let angle = this._spotAngle;
                    if (detlaRadius !== 0) {
                        newRadius = this.getConeRadius(this._spotAngle, newHeight) + detlaRadius;
                        newRadius = Math.abs(newRadius);

                        angle = Math.atan2(newRadius, newHeight) * 2;
                        if (angle < MathUtil.D2R) {
                            angle = MathUtil.D2R;
                        }
                        angle = angle * MathUtil.R2D;
                        angle = MathUtil.toPrecision(angle, 3);
                    }

                    setLightData(this.target, {spotAngle: angle, range: newHeight});
                    break;
            }
            // 发送节点修改消息
            Utils.broadcastMessage('scene:change-node', node);
        }
    }

    updateControllerTransform() {
        let node = this.node;
        let worldRot = cc.quat(0, 0, 0, 1);
        let worldPos = NodeUtils.getWorldPosition3D(node);

        if (this._curLightType !== this.Sphere) {
            worldRot = NodeUtils.getWorldRotation3D(node);
        }

        this._activeController.setPosition(worldPos);
        this._activeController.setRotation(worldRot);
    }

    getConeRadius(angle, height) {
        let radius = Math.tan(angle / 2 * MathUtil.D2R) * height;

        return radius;
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        let lightData = getLightData(this.target);
        if (lightData) {
            if (this._activeController) {
                this._activeController.hide();
            }

            this._curLightType = lightData.type;
            if (this._curLightType >= this._lightController.length) {
                console.error('no light controller of type:', this._curLightType);
                return;
            }

            this._activeController = this._lightController[this._curLightType];

            switch (this._curLightType) {
                case this.Direction:
                    break;
                case this.Sphere:
                    this._activeController.checkEdit();
                    this._activeController.radius = lightData.range;
                    break;
                case this.Spot:
                    this._activeController.checkEdit();
                    let radius = this.getConeRadius(lightData.spotAngle, lightData.range);
                    this._activeController.updateSize(cc.v3(), radius, lightData.range);
                    break;
            }

            this._activeController.show();
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
module.exports = LightComponentGizmo;
