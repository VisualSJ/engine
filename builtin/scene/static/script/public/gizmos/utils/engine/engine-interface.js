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

    setNodeOpacity(node, opacity) {
    }

    getRaycastResults(rootNode, x, y) {
    }

    getModel(node) {
    }

    updateVBAttr(mesh, attr, data) {
    }

    /**
     * 获得模型相关组件的包围盒
     * @param {*} component
     */
    getBoudingBox(component) {
    }

    getRootBoneNode(component) {
    }

    getRootBindPose(component) {
    }

    getCameraData(component) {
    }

    getLightData(component) {
    }
}

module.exports = EngineInterface;
