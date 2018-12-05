'use strict';
let EngineInterface = require('./engine-interface');
const CameraTool = Editor.require('packages://scene/panel/tools/camera');
const ControllerShapeCollider = require('../../3d/elements/utils/controller-shape-collider');
let External = require('../external');
let aabb = External.GeometryUtils.aabb;

let gfx = cc.renderer.renderEngine.gfx;
class Engine2D extends EngineInterface {
    constructor() {
        super();
        this.gfx = gfx;
    }

    create3DNode(name) {
        let node3d = new cc.Node(name);
        node3d.is3DNode = true;
        return node3d;
    }

    createMesh(primitive) {
        let mesh = new cc.Mesh();
        let vfmtPosColor = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
        ]);
        mesh.init(vfmtPosColor, primitive.positions.length, true);
        mesh.setVertices(gfx.ATTR_POSITION, primitive.positions);
        mesh.setIndices(primitive.indices);
        if (primitive.minPos) { mesh._minPos = primitive.minPos; }
        if (primitive.maxPos) { mesh._maxPos = primitive.maxPos; }
        if (primitive.primitiveType !== undefined) {
            mesh.setPrimitiveType(primitive.primitiveType);
        }
        return mesh;
    }

    addMeshToNode(node, mesh, opts = {}) {
        let renderer = node.addComponent(cc.MeshRenderer);
        renderer.mesh = mesh;
        let mat = renderer._material; // set depth
        let pass = mat._mainTech._passes[0];
        pass.setDepth(false, false);
        if (opts.cullMode) { pass.setCullMode(opts.cullMode); }
    }

    setMeshColor(node, c) {
        node.color = c;
    }

    setNodeOpacity(node, opacity) {
        node.opacity = opacity;
    }

    getRaycastResults(rootNode, x, y) {
        let ray = CameraTool._camera.getRay(cc.v3(x, y, 1));
        let results = cc.geomUtils.intersect.raycast(rootNode, ray, (modelRay, node, distance) => {
            let csc = node.getComponent(ControllerShapeCollider);
            if (csc && csc.isDetectMesh) {
                let meshRenderer = node.getComponent(cc.MeshRenderer);
                let subMeshes = meshRenderer.mesh._subMeshes;
                if (meshRenderer && meshRenderer.mesh &&
                    subMeshes && subMeshes[0]._primitiveType === gfx.PT_TRIANGLES) {
                    return cc.geomUtils.intersect.rayMesh(modelRay, meshRenderer.mesh);
                }
            }
            return distance;
        }, function(node) {
            let hasMesh = node.getComponent(cc.MeshRenderer);
            if (hasMesh == null || node.active === false) {
                return false;
            }
            return true;
        });
        results.ray = ray;
        return results;
    }

    getModel(node) {
        return node.getComponent(cc.MeshRenderer);
    }

    updateVBAttr(mesh, attr, data) {
        mesh.setVertices(attr, data);
    }

    getBoudingBox(component) {
        let boundingBox = null;
        if (component instanceof cc.MeshRenderer) {
            let mesh = component.mesh;
            if (mesh) {
                boundingBox = aabb.fromPoints(aabb.create(), mesh._minPos, mesh._maxPos);
            }
        } else {
            console.error('target is not a cc.MeshRenderer');
        }

        return boundingBox;
    }

    getRootBoneNode(component) {
        let rootBoneNode = null;
        if (component instanceof cc.SkinnedMeshRenderer) {
            let joints = component._joints;
            if (joints && joints.length > 0) {
                rootBoneNode = joints[0];
            }
        } else {
            console.error('target is not a cc.SkinnedMeshRenderer');
        }

        return rootBoneNode;
    }

    getRootBindPose(component) {
        let rootBindPose = null;

        if (component instanceof cc.SkinnedMeshRenderer) {
            let skeleton = component.skeleton;
            if (skeleton) {
                rootBindPose = skeleton.bindposes[0];
            }
        } else {
            console.error('target is not a cc.SkinnedMeshRenderer');
        }

        return rootBindPose;
    }
}

module.exports = new Engine2D();
