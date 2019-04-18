'use strict';
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let BoxController = require('../controller/box-controller');
let Gizmo = require('../gizmo-base');
const { getBoundingBox, getRootBoneNode, getRootBindPose } = require('../../../utils/engine');
let aabb = External.GeometryUtils.aabb;

const vec3 = cc.vmath.vec3;

class SkinningModelComponentGizmo extends Gizmo {
    init() {
        this._degreeToRadianFactor = Math.PI / 180;
        this.createController();
        this._isInited = true;
    }

    onShow() {
        this._controller.show();
        this.updateControllerTransform();
    }

    onHide() {
        this._controller.hide();
        let nodes = this.nodes;
        this.unregisterListeners(nodes);
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        this._controller = new BoxController(gizmoRoot);
        this._controller.setOpacity(150);
    }

    updateControllerTransform() {
        this.updateControllerData();
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        let rootBoneNode = getRootBoneNode(this.target);
        if (!rootBoneNode) {
            this._controller.hide();
            return;
        }

        const bounds = aabb.create(0, 0, 0, 0, 0, 0);
        if (this.target.calculateSkinnedBounds(bounds)) {
            const size = cc.v3();
            vec3.scale(size, bounds.halfExtents, 2);
            const center = cc.v3();
            vec3.copy(center, bounds.center);
            this._controller.updateSize(center, size);
        } else {
            this._controller.hide();
        }

        // let rootBindPose = getRootBindPose(this.target);
        // if (rootBindPose) {
        //     this._controller.show();
        //     let worldPos = NodeUtils.getWorldPosition3D(rootBoneNode);
        //     let worldRot = NodeUtils.getWorldRotation3D(rootBoneNode);
        //     let worldScale = NodeUtils.getWorldScale3D(rootBoneNode);

        //     this._controller.setPosition(worldPos);
        //     this._controller.setRotation(worldRot);
        //     this._controller.setScale(worldScale);

        //     let size = cc.v3();
        //     let boundingBox = getBoundingBox(this.target);

        //     //转换到rootBoneNode的坐标系
        //     let transformAABB = aabb.create(0, 0, 0, 0, 0, 0);
        //     boundingBox.transform(rootBindPose, null, null, null, transformAABB);
        //     //let transformAABB = boundingBox;
        //     vec3.scale(size, transformAABB.halfExtents, 2);
        //     let center = cc.v3(transformAABB.center.x, transformAABB.center.y, transformAABB.center.z);
        //     this._controller.updateSize(center, size);
        // } else {
        //     this._controller.hide();
        // }
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }

    onUpdate() {
        this.updateControllerData();
    }
}
module.exports = SkinningModelComponentGizmo;
