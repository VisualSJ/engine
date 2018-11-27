const NodeUtils = require('../../../../utils/node');
let DirectionLightController = require('../controller/direction-light-controller');
let PointLightController = require('../controller/sphere-controller');
let SpotLightController = require('../controller/cone-controller');
let Gizmo = require('../gizmo');
const GizmoManager = require('../../index');
const { create3DNode } = require('../../engine');

class LightComponentGizmo extends Gizmo {
    init() {
        this.Direction = 0;
        this.Point = 1;
        this.Spot = 2;
        this._curLightType = 0; // 0:direction, 1:point, 2:spot
        this._degreeToRadianFactor = Math.PI / 180;
        this.createController();
    }

    onShow() {
        if (!this._isInited) {
            this.createController();
            this._isInited = true;
        }
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
        this._lightController[this.Point] = new PointLightController(LightGizmoRoot);
        this._lightController[this.Spot] = new SpotLightController(LightGizmoRoot);
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

        if (this.target instanceof cc.LightComponent) {

            this._curLightType = this.target.type;
            this._lightController.forEach((controller) => {
                controller.hide();
            });

            if (this._curLightType >= this._lightController.length) {
                console.error('no light controller of type:', this._curLightType);
                return;
            }

            this._activeController = this._lightController[this._curLightType];

            switch (this._curLightType) {
                case this.Direction:
                    break;
                case this.Point:
                    this._activeController.radius = this.target.range;
                    break;
                case this.Spot:
                    let radius = Math.tan(this.target.spotAngle / 2 * this._degreeToRadianFactor) * this.target.range;
                    this._activeController.updateSize(cc.v3(), radius, this.target.range);
                    break;
            }

            this._activeController.show();
            this.updateControllerTransform();
        } else {
            console.error('target is not a cc.LightComponent');
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
