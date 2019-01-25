'use strict';
let EngineInterface = require('./engine-interface');
const CameraTool = require('../../../../3d/manager/camera');
let External = require('../external');
let aabb = External.GeometryUtils.aabb;

let flat = function(arr, fn) {
    return arr.map(fn).reduce((acc, val) => acc.concat(val), []);
};

const cmp = (a, b) => { return a.distance - b.distance; };
const ray = cc.geometry.ray.create();
const triangles = cc.GFXPrimitiveMode.TRIANGLE_LIST;

class Engine3D extends EngineInterface {
    constructor() {
        super();
        this.panPlaneLayer = cc.Layers.Editor;
        this.CullMode = {
            NONE: cc.GFXCullMode.NONE,
            BACK: cc.GFXCullMode.BACK,
            FRONT: cc.GFXCullMode.FRONT,
        };
        this.AttributeName = {
            POSITION: cc.GFXAttributeName.ATTR_POSITION,
            NORMAL: cc.GFXAttributeName.ATTR_NORMAL,
            UV: cc.GFXAttributeName.ATTR_TEX_COORD,
        };
        this.PrimitiveMode = {
            TRIANGLE_LIST: cc.GFXPrimitiveMode.TRIANGLE_LIST,
            POINT_LIST: cc.GFXPrimitiveMode.POINT_LIST,
            LINE_LIST: cc.GFXPrimitiveMode.LINE_LIST,
            LINE_STRIP: cc.GFXPrimitiveMode.LINE_STRIP,
            LINE_LOOP: cc.GFXPrimitiveMode.LINE_LOOP,
            TRIANGLE_STRIP: cc.GFXPrimitiveMode.TRIANGLE_STRIP,
            TRIANGLE_FAN: cc.GFXPrimitiveMode.TRIANGLE_FAN,
        };

        this.LightType = {
            DIRECTIONAL: cc.LightComponent.Type.DIRECTIONAL,
            POINT: cc.LightComponent.Type.POINT,
            SPOT: cc.LightComponent.Type.SPOT,
        };
    }

    create3DNode(name) {
        let node = new cc.Node(name);
        node._layer = cc.Layers.Gizmos;
        node.modelColor = cc.color();
        return node;
    }

    createMesh(primitive) {
        primitive.primitiveMode = primitive.primitiveType;
        primitive.positions = flat(primitive.positions, (v) => [v.x, v.y, v.z]);
        if (primitive.normals) { primitive.normals = flat(primitive.normals, (v) => [v.x, v.y, v.z]); }
        if (primitive.uvs) { primitive.uvs = flat(primitive.uvs, (v) => [v.x, v.y]); }
        let mesh = cc.utils.createMesh(primitive);
        const info = mesh.renderingMesh.getSubmesh(0).geometricInfo;
        if (info) info.doubleSided = primitive.doubleSided;
        return mesh;
    }

    addMeshToNode(node, mesh, opts = {}) {
        let model = node.addComponent(cc.ModelComponent);
        model.mesh = mesh;
        let technique = 0;
        let pm = mesh.renderingMesh.getSubmesh(0).primitiveMode;
        if (opts.unlit) {
            technique = 1;
        } else {
            if (pm < triangles) {
                technique = opts.noDepthTestForLines ? 1 : 2; // unlit
            }
        }
        model.material = new cc.Material({ effectName: '__editor-gizmo', technique });
        const mtl = model.material;
        let overrides = {};
        if (opts.cullMode) { overrides.rasterizerState = { cullMode: opts.cullMode }; }
        if (pm !== triangles) { overrides.primitive = pm; }
        if (Object.keys(overrides).length) mtl.overridePipelineStates(overrides);
        if (opts.alpha !== undefined) node.modelColor.a = opts.alpha;
        mtl.setProperty('color', node.modelColor);
        node.mtl = model.material;
    }

    setMeshColor(node, c) {
        node.modelColor = c.clone();
        node.mtl.setProperty('color', node.modelColor);
    }

    getMeshColor(node) {
        return node.modelColor;
    }

    setNodeOpacity(node, opacity) {
        node.modelColor.a = opacity;
        node.mtl.setProperty('color', node.modelColor);
    }

    getNodeOpacity(node) {
        return node.modelColor.a;
    }

    getRaycastResults(rootNode, x, y) {
        let scene = cc.director._scene._renderScene;
        let camera = CameraTool._camera._camera;
        camera.screenPointToRay(ray, x, y);
        let results = scene.raycast(ray, rootNode._layer).sort(cmp);
        results.ray = ray; return results;
    }

    getModel(node) {
        return node.getComponent(cc.ModelComponent);
    }

    updateVBAttr(comp, attr, data) {
        const ia = comp.model.getSubModel(0).inputAssembler;
        if (ia) ia.updateVertexAttr(attr, flat(data, (v) => [v.x, v.y, v.z]));
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
