'use strict';
const vec3 = cc.vmath.vec3;
const vec2 = cc.vmath.vec2;
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const EditorCamera = External.EditorCamera;
const ControllerUtils = require('../utils/controller-utils');
const ControllerShapeCollider = require('../utils/controller-shape-collider');
const { setNodeOpacity, create3DNode, setMeshColor, getModel, getMeshColor,
    getNodeOpacity } = require('../../../utils/engine');
let TransformToolData = require('../../../utils/transform-tool-data');
const Utils = require('../../../utils');

class ControllerBase {
    constructor(rootNode) {
        this._position = cc.v3(0, 0, 0);
        this._rotation = cc.quat(0, 0, 0, 1);
        this._scale = cc.v3(1, 1, 1);
        this._updated = false;

        // for 3d
        this.shape = null;
        this._rootNode = rootNode;
        this._baseDist = 600;
        this._axisDataMap = {};
        this._axisDir = {};
        this._axisDir.x = cc.v3(1, 0, 0);
        this._axisDir.y = cc.v3(0, 1, 0);
        this._axisDir.z = cc.v3(0, 0, 1);
        this._twoPI = Math.PI * 2;
        this._halfPI = Math.PI / 2;
        this._degreeToRadianFactor = Math.PI / 180;
    }

    get is2D() {
        return TransformToolData.is2D;
    }

    get scale2D() {
        return TransformToolData.scale2D;
    }

    createShapeNode(name) {
        this.shape = create3DNode(name);
        this.shape.parent = this._rootNode;
    }

    registerSizeChangeEvents() {
        this.registerCameraMovedEvent();

        TransformToolData.on('dimension-changed', this.onDimensionChanged.bind(this));
        TransformToolData.on('scale2D-changed', this.onScale2DChanged.bind(this));
    }

    registerCameraMovedEvent() {
        EditorCamera._camera.node.on('transform-changed', this.onEditorCameraMoved, this);
    }

    onEditorCameraMoved() {
        this.adjustControllerSize();
    }

    initAxis(node, axisName) {
        let axisData = {};
        axisData.topNode = node;
        axisData.rendererNodes = this.getRendererNodes(node);
        let colors = [];
        let opacitys = [];
        axisData.rendererNodes.forEach((node) => {
            let color = getMeshColor(node);
            colors.push(new cc.Color(color.r, color.g, color.b));
            opacitys.push(getNodeOpacity(node));
        });
        axisData.oriColors = colors;
        axisData.oriOpacitys = opacitys;
        this._axisDataMap[axisName] = axisData;

        let rayDetectNodes = this.getRayDetectNodes(node);
        rayDetectNodes.forEach((node) => {
            this.registerMouseEvents(node, axisName);
        });

        if (this.onInitAxis) {
            this.onInitAxis(node, axisName);
        }
    }

    setAxisColor(axisName, color, opacity = 255) {
        let rendererNodes = this._axisDataMap[axisName].rendererNodes;
        if (rendererNodes != null) {
            rendererNodes.forEach((node) => {
                setMeshColor(node, color);
                setNodeOpacity(node, opacity);
            });
        }
    }

    resetAxisColor() {
        for (let key in this._axisDataMap) {
            if (key) {
                let axisData = this._axisDataMap[key];
                //this.setAxisColor(key, axisData.oriColor, axisData.oriOpacity);
                let rendererNodes = axisData.rendererNodes;
                let oriColors = axisData.oriColors;
                let oriOpacitys = axisData.oriOpacitys;

                for (let i = 0; i < rendererNodes.length; i++) {
                    let node = rendererNodes[i];
                    setMeshColor(node, oriColors[i]);
                    setNodeOpacity(node, oriOpacitys[i]);
                }
            }

        }
    }

    registerMouseEvents(node, axisName) {
        node.on('mouseDown', function(event) {
            event.axisName = axisName;
            event.node = node;
            this._updated = false;
            if (this.onMouseDown) {
                this.onMouseDown(event);
            }
            event.stopPropagation();
        }.bind(this));

        node.on('mouseMove', function(event) {
            this._updated = true;
            event.axisName = axisName;
            event.node = node;
            if (this.onMouseMove) {
                this.onMouseMove(event);
            }
            event.stopPropagation();
            Utils.repaintEngine();
        }.bind(this));

        node.on('mouseUp', function(event) {
            event.axisName = axisName;
            event.node = node;
            if (this.onMouseUp) {
                this.onMouseUp(event);
            }
            event.stopPropagation();
            this._updated = false;
        }.bind(this));

        // 鼠标移出场景窗口，暂时处理为和mouseup等同
        node.on('mouseLeave', function(event) {
            if (this.onMouseLeave) {
                this.onMouseLeave(event);
            }
            event.stopPropagation();
            this._updated = false;
        }.bind(this));

        node.on('hoverIn', function(event) {
            event.axisName = axisName;
            event.node = node;
            if (this.onHoverIn) {
                this.onHoverIn(event);
            }
            event.stopPropagation();
            Utils.repaintEngine();
        }.bind(this));

        node.on('hoverOut', function(event) {
            event.axisName = axisName;
            event.node = node;
            if (this.onHoverOut) {
                this.onHoverOut(event);
            }
            event.stopPropagation();
            Utils.repaintEngine();
        }.bind(this));
    }

    get updated() {
        return this._updated;
    }

    setPosition(value) {
        if (value instanceof cc.Vec3) {
            this._position = value;
        } else {
            this._position = cc.v3(value.x, value.y, 0);
        }
        this.updateController();
    }

    getPosition() {
        return this._position;
    }

    setRotation(value) {
        this._rotation = value;
        this.updateController();
    }

    getScale() {
        return this._scale;
    }
    setScale(value) {
        this._scale = value;
        this.updateController();
    }

    updateController() {
        this.updateController3D();
    }

    updateController3D() {
        NodeUtils.setWorldPosition3D(this.shape, this._position);
        NodeUtils.setWorldRotation3D(this.shape, this._rotation);

        this.adjustControllerSize();
    }

    getCameraDistScalar(pos) {
        let cameraNode = EditorCamera._camera.node;
        let dist = ControllerUtils.getCameraDistanceFactor(pos, cameraNode);
        let scalar = dist / this._baseDist;

        return scalar;
    }

    getDistScalar() {
        let scalar = 1;

        if (this.is2D) {
            scalar = 1 / this.scale2D;
        } else {
            scalar = this.getCameraDistScalar(this._position);
        }

        return scalar;
    }

    adjustControllerSize() {
        // 根据和相机的距离，对坐标系进行整体放缩
        let scalar = this.getDistScalar();
        this.shape.setScale(this._scale.mul(scalar));
    }

    needRender(node) {
        let csc = node.getComponent(ControllerShapeCollider);
        if (csc && csc.isRender === false) {
            return false;
        }

        return true;
    }

    getRendererNodes(node) {
        let renderNodes = [];

        if (getModel(node) && this.needRender(node)) {
            renderNodes.push(node);
        }

        for (let i = 0; i < node.childrenCount; i++) {
            let child = node._children[i];
            renderNodes = renderNodes.concat(this.getRendererNodes(child));
        }

        return renderNodes;
    }

    getRayDetectNodes(node) {
        let rayDetectNodes = [];
        if (getModel(node)) { rayDetectNodes.push(node); }

        for (let i = 0; i < node.childrenCount; i++) {
            let child = node._children[i];
            rayDetectNodes = rayDetectNodes.concat(this.getRayDetectNodes(child));
        }

        return rayDetectNodes;
    }

    localToWorldPosition(localPos) {
        let worldMatrix = cc.mat4();
        let worldPos = cc.v3(0, 0, 0);
        this.shape.getWorldMatrix(worldMatrix);

        vec3.transformMat4(worldPos, localPos, worldMatrix);

        return worldPos;
    }

    worldPosToScreenPos(worldPos) {
        let camera = EditorCamera._camera._camera;
        let screenPos = cc.v2();
        camera.worldToScreen(screenPos, worldPos, cc.visibleRect.width, cc.visibleRect.height);

        return screenPos;
    }

    getScreenPos(localPos) {
        return this.worldPosToScreenPos(this.localToWorldPosition(localPos));
    }

    getAlignAxisMoveDistance(axisWorldDirEndPos, deltaPos) {
        let dirInScreen = this.worldPosToScreenPos(axisWorldDirEndPos);
        let oriPosInScreen = this.worldPosToScreenPos(this._position);
        vec2.sub(dirInScreen, dirInScreen, oriPosInScreen);
        vec2.normalize(dirInScreen, dirInScreen);
        //console.log(axisWorldDir, dirInScreen, deltaPos);
        let alignAxisMoveDist = vec2.dot(deltaPos, dirInScreen);
        return alignAxisMoveDist;
    }

    show() {
        this.shape.active = true;

        if (this.onShow) {
            this.onShow();
        }
    }

    hide() {
        this.shape.active = false;

        if (this.onHide) {
            this.onHide();
        }
    }

    get visible() {
        return this.shape.active;
    }

    onDimensionChanged() {
        if (this.visible) {
            this.show();
        }
    }

    onScale2DChanged() {
        if (this.visible) {
            this.adjustControllerSize();
        }
    }
}

module.exports = ControllerBase;
