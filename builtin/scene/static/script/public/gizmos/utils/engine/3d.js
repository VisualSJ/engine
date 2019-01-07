'use strict';
let EngineInterface = require('./engine-interface');
const CameraTool = require('../../../../3d/manager/camera');
let External = require('../external');
let aabb = External.GeometryUtils.aabb;

let gfx = cc.gfx;
let flat = function(arr, fn) {
    return arr.map(fn).reduce((acc, val) => acc.concat(val), []);
};

const cmp = (a, b) => { return a.distance - b.distance; };
const ray = cc.geometry.ray.create();

class Engine3D extends EngineInterface {
    constructor() {
        super();
        this.gfx = gfx;
        this.panPlaneLayer = cc.Layers.Editor;
    }

    create3DNode(name) {
        let node = new cc.Node(name);
        node._layer = cc.Layers.Gizmos;
        node.modelColor = cc.color();
        return node;
    }

    createMesh(primitive) {
        primitive.positions = flat(primitive.positions, (v) => [v.x, v.y, v.z]);
        if (primitive.normals) { primitive.normals = flat(primitive.normals, (v) => [v.x, v.y, v.z]); }
        if (primitive.uvs) { primitive.uvs = flat(primitive.uvs, (v) => [v.x, v.y]); }
        let mesh = cc.utils.createMesh(cc.game._renderContext, primitive);
        mesh.getSubMesh(0).doubleSided = primitive.doubleSided;
        return mesh;
    }

    addMeshToNode(node, mesh, opts = {}) {
        let model = node.addComponent(cc.ModelComponent);
        model.mesh = mesh;
        let mtl = new cc.Material();
        mtl.effectName = '__editor-gizmo';
        if (opts.unlit) {
            mtl.effect.LOD = 50;
        } else {
            if (mesh.getSubMesh(0)._primitiveType < gfx.PT_TRIANGLES) {
                mtl.effect.LOD = opts.noDepthTestForLines ? 50 : 0; // unlit
                //node.modelColor.a = opts.alpha || 128; // blend in
            }
        }
        mtl.setProperty('color', node.modelColor);
        if (mtl.effect) {
            let pass = mtl.effect.getActiveTechnique().passes[0];
            if (opts.cullMode) { pass.setCullMode(opts.cullMode); }
        }
        model.material = mtl;
    }

    setMeshColor(node, c) {
        node.modelColor.r = c.r;
        node.modelColor.g = c.g;
        node.modelColor.b = c.b;
    }

    getMeshColor(node) {
        return node.modelColor;
    }

    setNodeOpacity(node, opacity) {
        node.modelColor.a = opacity;
    }

    getNodeOpacity(node) {
        return node.modelColor.a;
    }

    getRaycastResults(rootNode, x, y) {
        let scene = cc.director._renderSystem._scene;
        let camera = CameraTool._camera._camera;
        camera.screenPointToRay(x, y, cc.winSize.width, cc.winSize.height, ray);
        let results = scene.raycast(ray, rootNode._layer).sort(cmp);
        results.ray = ray; return results;
    }

    getModel(node) {
        return node.getComponent(cc.ModelComponent);
    }

    updateVBAttr(mesh, attr, data) {
        let vb = mesh.getSubMesh(0)._vertexBuffer;
        let cache = vb[attr];
        data.forEach((v, i) => {
            cache[i * 3] = v.x; cache[i * 3 + 1] = v.y; cache[i * 3 + 2] = v.z;
        });
        vb.updateAttr(attr);
    }

    getBoudingBox(component) {
        let boundingBox = null;
        if (component instanceof cc.ModelComponent) {
            let mesh = component.mesh;
            if (mesh) {
                boundingBox = aabb.fromPoints(aabb.create(), mesh.minPosition, mesh.maxPosition);
            }
        } else {
            console.error('target is not a cc.ModelComponent');
        }

        return boundingBox;
    }

    getRootBoneNode(component) {
        let rootBoneNode = null;
        if (component instanceof cc.SkinningModelComponent) {
            if (component.skeleton) {
                let joints = component.skeleton.joints;
                if (joints && joints.length > 0 && component._skinningTarget) {
                    rootBoneNode = component._skinningTarget.get(joints[0]);
                }
            }
        } else {
            console.error('target is not a cc.SkinningModelComponent');
        }

        return rootBoneNode;
    }

    getRootBindPose(component) {
        let rootBindPose = null;

        if (component instanceof cc.SkinningModelComponent) {
            let skeleton = component.skeleton;
            if (skeleton) {
                rootBindPose = skeleton.bindposes[0];
            }
        } else {
            console.error('target is not a cc.SkinningModelComponent');
        }

        return rootBindPose;
    }

    getCameraData(component) {
        let cameraData = null;

        if (component instanceof cc.CameraComponent) {
            cameraData = {};
            cameraData.projection = component.projection;
            cameraData.orthoHeight = component.orthoHeight;
            cameraData.fov = component.fov;
            cameraData.aspect = cc.winSize.width / cc.winSize.height;
            cameraData.near = component.near;
            cameraData.far = component.far;
        } else {
            console.error('target is not a cc.CameraComponent');
        }

        return cameraData;
    }

    setCameraData(component, cameraData) {
        if (component instanceof cc.CameraComponent) {
            if (cameraData.fov) {
                component.fov = cameraData.fov;
            }
            if (cameraData.far) {
                component.far = cameraData.far;
            }
        } else {
            console.error('target is not a cc.CameraComponent');
        }
    }

    getLightData(component) {
        let lightData = null;

        if (component instanceof cc.LightComponent) {
            lightData = {};
            lightData.type = component.type;
            lightData.range = component.range;
            lightData.spotAngle = component.spotAngle;
        } else {
            console.error('target is not a cc.LightComponent');
        }

        return lightData;
    }

    setLightData(component, lightData) {
        if (component instanceof cc.LightComponent) {
            if (lightData.range) {
                component.range = lightData.range;
            }
            if (lightData.spotAngle) {
                component.spotAngle = lightData.spotAngle;
            }

        } else {
            console.error('target is not a cc.LightComponent');
        }
    }
}

module.exports = new Engine3D();
