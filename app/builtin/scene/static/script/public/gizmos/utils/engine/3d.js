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
            SPHERE: cc.LightComponent.Type.SPHERE,
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
        // prepare data
        primitive.primitiveMode = primitive.primitiveType;
        primitive.positions = flat(primitive.positions, (v) => [v.x, v.y, v.z]);
        if (primitive.normals) { primitive.normals = flat(primitive.normals, (v) => [v.x, v.y, v.z]); }
        if (primitive.uvs) { primitive.uvs = flat(primitive.uvs, (v) => [v.x, v.y]); }
        // create
        let mesh = cc.utils.createMesh(primitive);
        // set double sided flag for raycast
        const submesh = mesh.renderingMesh.getSubmesh(0);
        const info = submesh.geometricInfo;
        if (info) { info.doubleSided = primitive.doubleSided; }
        // cache vb buffer for vb update
        const vbInfo = mesh.struct.vertexBundles[0].view;
        submesh.vbuffer = mesh.data.buffer.slice(vbInfo.offset, vbInfo.offset + vbInfo.length);
        return mesh;
    }

    addMeshToNode(node, mesh, opts = {}) {
        let model = node.addComponent(cc.ModelComponent);
        if (!opts.forwardPipeline) {
            model._sceneGetter = cc.director.root.ui.getRenderSceneGetter();
        }
        model.mesh = mesh;
        const cb = model.onEnable.bind(model);
        model.onEnable = () => { cb(); model.model.viewID = -1; } // don't show on preview cameras
        let pm = mesh.renderingMesh.getSubmesh(0).primitiveMode;
        let technique = 0;
        let effectName = 'editor/gizmo';
        if (opts.effectName) {
            effectName = opts.effectName;
        } else {
            if (opts.unlit) {
                technique = 1;
            } else if (opts.texture) {
                technique = 3;
            } else {
                if (pm < triangles) {
                    technique = opts.noDepthTestForLines ? 1 : 2; // unlit
                }
            }
        }

        const mtl = node.mtl = new cc.Material();
        let states = {};
        if (opts.cullMode) { states.rasterizerState = { cullMode: opts.cullMode }; }
        if (pm !== triangles) { states.primitive = pm; }
        if (opts.priority) {
            states.priority = opts.priority;
        }

        mtl.initialize({ effectName, technique, states });
        if (opts.alpha !== undefined) { node.modelColor.a = opts.alpha; }
        mtl.setProperty('color', node.modelColor);
        model.material = mtl;
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

    setMaterialProperty(node, propName, value) {
        if (node && node.mtl) {
            node.mtl.setProperty(propName, value);
        }
    }

    getRaycastResults(rootNode, x, y) {
        let scene = cc.director.root.ui.renderScene;
        let camera = CameraTool._camera._camera;
        camera.screenPointToRay(ray, x, y);
        let results = scene.raycast(ray, rootNode._layer).sort(cmp);
        results.ray = ray; return results;
    }

    getModel(node) {
        return node.getComponent(cc.ModelComponent);
    }

    updateVBAttr(comp, attr, data) {
        const model = comp.model.getSubModel(0);
        if (!model) { return; }
        const ia = model.inputAssembler;
        if (ia && model.subMeshData) {
            const mesh = model.subMeshData;
            // update vb
            const points = flat(data, (v) => [v.x, v.y, v.z]);
            ia.updateVertexAttr(mesh.vbuffer, attr, points);
            // sync to raycast data
            if (mesh.geometricInfo) {
                mesh.geometricInfo.positions.set(points);
            }
        }
    }

    updateBoundingBox(meshComp, minPos, maxPos) {
        const model = meshComp.model;
        if (!model) { return; }

        model.createBoundingShape(minPos, maxPos);

        const mesh = model.mesh;
        if (mesh && mesh.struct) {
            mesh.struct.minPosition = minPos;
            mesh.struct.maxPosition = maxPos;
        }
    }

    getBoundingBox(component) {
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
            rootBoneNode = component.skinningRoot;
        } else {
            console.error('target is not a cc.SkinningModelComponent');
        }

        return rootBoneNode;
    }

    getRootBindPose(component) {
        let rootBindPose = null;

        if (component instanceof cc.SkinningModelComponent) {
            let root = component.skinningRoot;
            let skeleton = component.skeleton;
            if (root) {
                const iRoot = skeleton.joints.findIndex((joint) => joint === '');
                if (iRoot !== undefined) {
                    rootBindPose = skeleton.bindposes[iRoot];
                }
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
