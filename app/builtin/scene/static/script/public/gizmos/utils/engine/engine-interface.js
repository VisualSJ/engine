'use strict';

// Engine相关的接口适配
class EngineInterface {
    create3DNode(name) {
    }

    createMesh(primitive) {
    }

    addMeshToNode(node, mesh, opts = {}) {
    }

    setMeshColor(node, c) {
    }

    getMeshColor(node) {
    }

    setNodeOpacity(node, opacity) {
    }

    getNodeOpacity(node) {
    }

    setMaterialProperty(node, propName, value) {
    }

    getRaycastResults(rootNode, x, y) {
    }

    getModel(node) {
    }

    updateVBAttr(mesh, attr, data) {
    }

    updateBoundingBox(meshComp, minPos, maxPos) {
    }

    /**
     * 获得模型相关组件的包围盒
     * @param {*} component
     */
    getBoundingBox(component) {
    }

    getRootBoneNode(component) {
    }

    getRootBindPose(component) {
    }

    getCameraData(component) {
    }

    setCameraData(component, cameraData) {
    }

    getLightData(component) {
    }

    setLightData(component, lightData) {
    }
}

module.exports = EngineInterface;
