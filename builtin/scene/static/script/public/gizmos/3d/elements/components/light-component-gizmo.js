'use strict';
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let DirectionLightController = require('../controller/direction-light-controller');
let PointLightController = require('../controller/sphere-controller');
let SpotLightController = require('../controller/cone-controller');
let Gizmo = require('../gizmo-base');
let ControllerUtils = require('../utils/controller-utils');
const { create3DNode, getLightData } = require('../../../utils/engine');
const MathUtil = External.EditorMath;

class LightComponentGizmo extends Gizmo {
    init() {
        this.Direction = 0;
        this.Point = 1;
        this.Spot = 2;
        this._curLightType = 0; // 0:direction, 1:point, 2:spot
        this.createController();
        this._isInited = true;
    }

    onShow() {
        this.updateControllerData();
        this.updateControllerTransform();
    }

    onHide() {
        this._activeController.hide();
        let nodes = this.nodes;
        this.unRegisterNodeEvents(nodes, this.onNodeChanged, this);
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        let LightGizmoRoot = create3DNode('LightGizmo');
        LightGizmoRoot.parent = gizmoRoot;

        this._lightController = [];
        this._lightController[this.Direction] = new DirectionLightController(LightGizmoRoot);
        this._lightController[this.Direction].setColor(ControllerUtils.LightGizmoColor);
        this._lightController[this.Point] = new PointLightController(LightGizmoRoot);
        this._lightController[this.Point].setColor(ControllerUtils.LightGizmoColor);
        this._lightController[this.Spot] = new SpotLightController(LightGizmoRoot);
        this._lightController[this.Spot].setColor(ControllerUtils.LightGizmoColor);
        this._activeController = this._lightController[2];
    }

    updateControllerTransform() {
        let node = this.node;
        let worldRot = cc.quat(0, 0, 0, 1);
        let worldPos = NodeUtils.getWorldPosition3D(node);

        if (this._curLightType !== this.Point) {
            worldRot = NodeUtils.getWorldRotation3D(node);
        }

        this._activeController.setPosition(worldPos);
        this._activeController.setRotation(worldRot);
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
                case this.Point:
                    this._activeController.radius = lightData.range;
                    break;
                case this.Spot:
                    let radius = Math.tan(lightData.spotAngle / 2 * MathUtil.D2R) * lightData.range;
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
