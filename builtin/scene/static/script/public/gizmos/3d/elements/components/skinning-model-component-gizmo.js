'use strict';
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
let BoxController = require('../controller/box-controller');
let Gizmo = require('../gizmo-base');
const { create3DNode } = require('../../../utils/engine');
let aabb = External.GeometryUtils.aabb;

const vec3 = cc.vmath.vec3;

class SkinningModelComponentGizmo extends Gizmo {
    init() {
        this._degreeToRadianFactor = Math.PI / 180;
        this.createController();
    }

    onShow() {
        this._controller.show();
        this.updateControllerData();
        this.updateControllerTransform();
    }

    onHide() {
        this._controller.hide();
        let nodes = this.nodes;
        this.unRegisterNodeEvents(nodes, this.onNodeChanged, this);
    }

    createController() {
        let gizmoRoot = this.getGizmoRoot();
        this._controller = new BoxController(gizmoRoot);
    }

    updateControllerTransform() {
        let node = this.node;
        let worldRot = cc.quat(0, 0, 0, 1);
        let worldPos = NodeUtils.getWorldPosition3D(node);

        worldRot = NodeUtils.getWorldRotation3D(node);

        this._controller.setPosition(worldPos);
        this._controller.setRotation(worldRot);
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        let skinMeshComp = this.node.getComponent(cc.ModelComponent);
        let mesh = skinMeshComp.mesh;
        let boundingBox = aabb.fromPoints(aabb.create(), mesh.minPosition, mesh.maxPosition);
        let size = cc.v3();

        // let rootBoneNode = skinMeshRenderer._joints[0];

        // if (rootBoneNode) {
        //     let rootBindPose = skinMeshRenderer.skeleton.bindposes[0];

        //     let m4_temp = cc.mat4();
        //     rootBoneNode.getWorldMatrix(m4_temp);
        //     //mat4.multiply(m4_temp, m4_temp, rootBindPose);
        //     let worldPos = NodeUtils.getWorldPosition3D(rootBoneNode);
        //     let worldRot = NodeUtils.getWorldRotation3D(rootBoneNode);
        //     let worldScale = NodeUtils.getWorldScale3D(rootBoneNode);

        //     //转换到rootBoneNode的坐标系
        //     let transformAABB = aabbTool.create(0, 0, 0, 0, 0, 0);
        //     boundingBox.transform(rootBindPose, null, null, null, transformAABB);

        //     //let transformAABB = boundingBox;
        //     vec3.scale(size, transformAABB.halfExtents, 2);
        //     let center = cc.v3(transformAABB.center.x, transformAABB.center.y, transformAABB.center.z);
        //     this._controller.updateSize(center, size);

        //     this._controller.setPosition(worldPos);
        //     this._controller.setRotation(worldRot);
        //     this._controller.setScale(worldScale);
        // }

        vec3.scale(size, boundingBox.halfExtents, 2);
        let center = cc.v3(boundingBox.center.x, boundingBox.center.y, boundingBox.center.z);
        this._controller.updateSize(center, size);
        let worldScale = NodeUtils.getWorldScale3D(this.node);
        this._controller.setScale(worldScale);
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = SkinningModelComponentGizmo;
