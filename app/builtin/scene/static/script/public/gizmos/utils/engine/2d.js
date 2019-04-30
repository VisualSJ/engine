'use strict';
let EngineInterface = require('./engine-interface');
const CameraTool = Editor.require('packages://scene/panel/tools/camera');
const ControllerShapeCollider = require('../../3d/elements/utils/controller-shape-collider');
let External = require('../external');
let aabb = External.GeometryUtils.aabb;

let gfx = cc.gfx;

function setMatColor(node, c) {
    let renderer = node.getComponent(cc.MeshRenderer);
    if (renderer) { 
        let mtl = renderer.sharedMaterials[0];
        if (mtl) {
            mtl.setProperty('color', c);
        }          
    }
} 

let ProjectionType = {
    ORTHO: 0,
    PERSPECTIVE: 1,
};
class Engine2D extends EngineInterface {
    constructor() {
        super();
        this.gfx = gfx;

        this.CullMode = {
            NONE: gfx.CULL_NONE,
            BACK: gfx.CULL_BACK,
            FRONT: gfx.CULL_FRONT,
        };
        this.AttributeName = {
            POSITION: gfx.ATTR_POSITION,
            NORMAL: gfx.ATTR_NORMAL,
            UV: gfx.ATTR_UV,
        };
        this.PrimitiveMode = {
            TRIANGLE_LIST: gfx.PT_TRIANGLES,
            POINT_LIST: gfx.PT_POINTS,
            LINE_LIST: gfx.PT_LINES,
            LINE_STRIP: gfx.PT_LINE_STRIP,
            LINE_LOOP: gfx.PT_LINE_LOOP,
            TRIANGLE_STRIP: gfx.PT_TRIANGLE_STRIP,
            TRIANGLE_FAN: gfx.PT_TRIANGLE_FAN,
        };

        this.LightType = {
            DIRECTIONAL: cc.LightComponent.Type.DIRECTIONAL,
            SPHERE: cc.LightComponent.Type.SPHERE,
            SPOT: cc.LightComponent.Type.SPOT,
        };

        this.ProjectionType = ProjectionType;
    }

    create3DNode (name) {
        let node3d = new cc.Node(name);
        node3d.is3DNode = true;
        node3d._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
        return node3d;
    }

    createMesh (primitive) {
        let mesh = new cc.Mesh();
        let vfmtPosColor = new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
            { name: gfx.ATTR_NORMAL, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
        ]);

        mesh.init(vfmtPosColor, primitive.positions.length, true);
        mesh.setVertices(gfx.ATTR_POSITION, primitive.positions);
        if (primitive.normals) { mesh.setVertices(gfx.ATTR_NORMAL, primitive.normals); }
        mesh.setIndices(primitive.indices);
        if (primitive.minPos) { mesh._minPos = primitive.minPos; }
        if (primitive.maxPos) { mesh._maxPos = primitive.maxPos; }
        if (primitive.primitiveType !== undefined) {
            mesh.setPrimitiveType(primitive.primitiveType);
        }
        return mesh;
    }

    addMeshToNode (node, mesh, opts = {}) {
        let renderer = node.addComponent(cc.MeshRenderer);
        renderer.mesh = mesh;
        
        let mtl = new cc.Material();
        if (opts.unlit) {
            mtl.effectName = '__builtin-editor-gizmo-unlit';
            if (mtl.effect) { 
                mtl.effect.getTechnique('transparent').passes[0].setDepth(false); 
            }
        }
        else {
            if (mesh.subMeshes[0]._primitiveType < gfx.PT_TRIANGLES) {
                if (opts.noDepthTestForLines) {
                    mtl.effectName = '__builtin-editor-gizmo-unlit';
                    if (mtl.effect) { 
                        mtl.effect.getTechnique('transparent').passes[0].setDepth(false); 
                    }                
                }
                else {
                    mtl.effectName = '__builtin-editor-gizmo-line';
                }
            } 
            else { 
                mtl.effectName = '__builtin-editor-gizmo';
            }
        }


        mtl.setProperty('color', node._color);
        
        if (mtl.effect) {
            let pass = mtl.effect.getTechnique('transparent').passes[0];
            if (opts.cullMode) { pass.setCullMode(opts.cullMode); }
        }

        renderer.setMaterial(0, mtl);
    }

    setMeshColor (node, c) {
        node.color = c;
        let color = c.clone();
        color.a = node.opacity;
        setMatColor(node, color);
    }

    getMeshColor (node) {
        return node.color;
    }

    setNodeOpacity (node, opacity) {
        node.opacity = opacity;
        let color = node.color;
        color.a = opacity;
        setMatColor(node, color);
    }

    getNodeOpacity (node) {
        return node.opacity;
    }

    getRaycastResults (rootNode, x, y) {
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
        }, function (node) {
            let hasMesh = node.getComponent(cc.MeshRenderer);
            if (hasMesh == null || node.active === false) {
                return false;
            }
            return true;
        });
        results.ray = ray;
        return results;
    }

    getModel (node) {
        return node.getComponent(cc.MeshRenderer);
    }

    updateVBAttr (mesh, attr, data) {
        mesh.setVertices(attr, data);
    }

    getBoundingBox (component) {
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

    getRootBoneNode (component) {
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

    getRootBindPose (component) {
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

    getCameraData (component) {
        let cameraData = null;

        if (component instanceof cc.Camera) {
            cameraData = {};
            if (component.ortho) {
                cameraData.projection = this.ProjectionType.ORTHO;
            }
            else {
                cameraData.projection = this.ProjectionType.PERSPECTIVE;
            }

            cameraData.orthoHeight = component.orthoSize;
            cameraData.fov = component.fov;
            cameraData.aspect = cc.winSize.width / cc.winSize.height;
            cameraData.near = component.nearClip;
            cameraData.far = component.farClip;
        } else {
            console.error('target is not a cc.Camera');
        }

        return cameraData;
    }

    setCameraData (component, cameraData) {
        if (component instanceof cc.Camera) {
            if (cameraData.fov) {
                component.fov = cameraData.fov;
            }
            if (cameraData.far) {
                component.farClip = cameraData.far;
            }
            if (cameraData.orthoHeight) {
                component.orthoSize = cameraData.orthoHeight;
            }
        } else {
            console.error('target is not a cc.Camera');
        }
    }

    getLightData (component) {
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

    setLightData (component, lightData) {
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

module.exports = new Engine2D();
