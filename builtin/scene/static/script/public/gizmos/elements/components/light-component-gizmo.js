const NodeUtils = require('../../../../utils/node');
let DirectionLightController = require('../controller/direction-light-controller');
let Gizmo = require('../gizmo');
const GizmoManager = require('../../index');
const { create3DNode } = require('../../engine');

class LightComponentGizmo extends Gizmo {
    init() {

    }

    onCreateController() {
        let gizmoRoot = this.getGizmoRoot();
        let LightGizmoRoot = create3DNode('LightGizmo');
        LightGizmoRoot.parent = gizmoRoot;
        this._controller = new DirectionLightController(LightGizmoRoot);
    }

    updateControllerTransform() {
        let node = this.node;
        let worldPos;
        let worldRot = cc.quat(0, 0, 0, 1);

        worldPos = NodeUtils.getWorldPosition3D(node);
        worldRot = NodeUtils.getWorldRotation3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }
}
module.exports = LightComponentGizmo;
