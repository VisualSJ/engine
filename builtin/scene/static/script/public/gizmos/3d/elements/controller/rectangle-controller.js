'use strict';

let EditableController = require('./editable-controller');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { AttributeName, getModel, updateVBAttr, setMeshColor,
    setNodeOpacity, getRaycastResults, panPlaneLayer, updateBoundingBox } = require('../../../utils/engine');
const External = require('../../../utils/external');
const EditorCamera = External.EditorCamera;

const vec3 = cc.vmath.vec3;
let tempVec3 = cc.v3();

let RectHandleType = {
    None: 'none',
    TopLeft: 'tl',
    TopRight: 'tr',
    BottomLeft: 'bl',
    BottomRight: 'br',

    Left: 'neg_x',
    Right: 'x',
    Top: 'y',
    Bottom: 'neg_y',

    Area: 'area',
    Anchor: 'anchor',
};

class RectangleController extends EditableController {
    constructor(rootNode) {
        super(rootNode);

        this._color = cc.Color.WHITE;
        this._center = cc.v3();
        this._size = cc.v2(100, 100);

        this._axisDir[RectHandleType.Left] = cc.v3(-1, 0, 0);
        this._axisDir[RectHandleType.Bottom] = cc.v3(0, -1, 0);
        this._axisDir[RectHandleType.TopLeft] = cc.v3(-1, 1, 0); // top left
        this._axisDir[RectHandleType.TopRight] = cc.v3(1, 1, 0);  // top right
        this._axisDir[RectHandleType.BottomLeft] = cc.v3(-1, -1, 0); // bottom left
        this._axisDir[RectHandleType.BottomRight] = cc.v3(1, -1, 0); // bttom right
        this._axisDir[RectHandleType.Anchor] = cc.v3();
        delete this._axisDir.z;
        this._deltaSize = cc.v3();
        this._curHandleType = RectHandleType.None;

        this.initShape();
    }

    setColor(color) {
        if (this._rectNode) {
            this._color = color;
            setMeshColor(this._rectNode, color);
        }
    }

    setOpacity(opacity) {
        if (this._rectNode) {
            setNodeOpacity(this._rectNode, opacity);
        }
    }

    isBorder(axisName) {
        if (axisName === RectHandleType.Left ||
            axisName === RectHandleType.Right ||
            axisName === RectHandleType.Top ||
            axisName === RectHandleType.Bottom) {
            return true;
        }

        return false;
    }

    isCorner(axisName) {
        if (axisName === RectHandleType.TopLeft ||
            axisName === RectHandleType.TopRight ||
            axisName === RectHandleType.BottomLeft ||
            axisName === RectHandleType.BottomRight) {
            return true;
        }

        return false;
    }

    onInitEditController() {
        // for pan
        let panPlane = ControllerUtils.quad(cc.v3(), 100000, 100000);
        panPlane.parent = this._rootNode;
        panPlane.name = 'RectPanPlane';
        panPlane.active = false;
        panPlane.layer = panPlaneLayer;
        setNodeOpacity(panPlane, 0);
        this._panPlane = panPlane;

        // for center move
        let areaNode = ControllerUtils.quad(cc.v3(), 100, 100, cc.Color.GREEN);
        areaNode.name = 'RectArea';
        areaNode.parent = this.shape;
        areaNode.setPosition(cc.v3(0, 0, -1));
        setNodeOpacity(areaNode, 0);
        this._areaMR = getModel(areaNode);
        this.initAxis(areaNode, RectHandleType.Area);
    }

    createEditController(axisName, color) {
        let ctrlSize = this._defaultEditCtrlSize * 2;
        let editCtrlNode = ControllerUtils.quad(cc.v3(), ctrlSize, ctrlSize, color, {unlit : true});

        // if (isBorder(editCtrlNode)) {
        //     setNodeOpacity(editCtrlNode, 0);
        // }
        editCtrlNode.name = axisName;
        editCtrlNode.parent = this._editControllerShape;
        this._editCtrlScales[axisName] = cc.v3(1, 1, 1);
        this.initAxis(editCtrlNode, axisName);
        this._updateEditController(axisName);
    }

    _updateEditController(axisName) {
        let node = this._axisDataMap[axisName].topNode;
        let dir = this._axisDir[axisName];
        let baseScale = this._editCtrlScales[axisName];
        if (axisName === RectHandleType.Anchor) {
            node.setScale(baseScale / this._scale.x, baseScale / this._scale.y, baseScale / this._scale.z);
            node.setWorldPosition(this._position);
        } else {
            let offset = cc.v3();
            offset.x = dir.x * this._size.x / 2;
            offset.y = dir.y * this._size.y / 2;

            let pos = offset.add(this._center);
            node.setScale(baseScale / this._scale.x, baseScale / this._scale.y, baseScale / this._scale.z);
            node.setPosition(pos.x, pos.y, pos.z);
        }

    }

    initShape() {
        this.createShapeNode('RectangleController');
        this._rectNode = ControllerUtils.rectangle(this._center, this._rotation, this._size, this._color);
        this._rectNode.parent = this.shape;
        this._rectMR = getModel(this._rectNode);
        EditorCamera._camera.node.on('transform-changed', this.onEditorCameraMoved, this);
    }

    updateSize(center, size) {
        this._center = center;
        this._size = size;

        let rectData = ControllerShape.calcRectanglePoints(this._center, this._rotation, this._size);

        updateVBAttr(this._rectMR, AttributeName.POSITION, rectData.vertices);

        if (this._edit) {
            this.updateEditControllers();

            let quadData = ControllerShape.calcQuadData(this._center, this._size.x, this._size.y);
            updateVBAttr(this._areaMR, AttributeName.POSITION, quadData.vertices);
            updateBoundingBox(this._areaMR, quadData.minPos, quadData.maxPos);
        }

        this.adjustEditControllerSize();
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    getPositionOnPanPlane(hitPos, x, y, panPlane) {
        let results = getRaycastResults(panPlane, x, y);
        let ray = results.ray;

        if (results.length > 0) {
            let firstResult = results[0];
            vec3.scale(hitPos, ray.d, firstResult.distance);
            vec3.add(hitPos, ray.o, hitPos);

            return true;
        }

        return false;
    }

    onMouseDown(event) {
        this._mouseDeltaPos = cc.v2(0, 0);
        this._curDistScalar = super.getDistScalar();
        vec3.set(this._deltaSize, 0, 0, 0);

        this._panPlane.active = true;
        this._mouseDownOnPlanePos = cc.v3();

        this.getPositionOnPanPlane(this._mouseDownOnPlanePos, event.x, event.y, this._panPlane);

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        this._mouseDeltaPos.x += event.moveDeltaX;
        this._mouseDeltaPos.y += event.moveDeltaY;

        let hitPos = cc.v3();
        if (this.getPositionOnPanPlane(hitPos, event.x, event.y, this._panPlane)) {
            let deltaPos = hitPos.sub(this._mouseDownOnPlanePos);
            this._curHandleType = event.axisName;
            let axisDir = this._axisDir[event.axisName];
            let deltaDist = 0;

            if (this.isBorder(event.axisName)) {
                deltaDist = deltaPos.dot(axisDir);
                if (this._curHandleType === RectHandleType.Left ||
                    this._curHandleType === RectHandleType.Right) {
                        this._deltaSize.x = deltaDist;
                } else {
                    this._deltaSize.y = deltaDist;
                }
            } else if (this.isCorner(event.axisName)) {
                tempVec3.x = axisDir.x;
                tempVec3.y = 0;
                deltaDist = deltaPos.dot(tempVec3);
                this._deltaSize.x = deltaDist;

                tempVec3.x = 0;
                tempVec3.y = axisDir.y;
                deltaDist = deltaPos.dot(tempVec3);
                this._deltaSize.y = deltaDist;
            } else {
                this._deltaSize = deltaPos;
            }
        }

        if (this.onControllerMouseMove != null) {
            this.onControllerMouseMove(event);
        }
    }

    onMouseUp(event) {
        this._curHandleType = RectHandleType.None;
        this._panPlane.active = false;

        if (this.onControllerMouseUp != null) {
            this.onControllerMouseUp();
        }
    }

    onMouseLeave() {
        this.onMouseUp();
    }

    onHoverIn(event) {
        if (event.axisName !== RectHandleType.Area) {
            this.setAxisColor(event.axisName, ControllerUtils.YELLOW);
        }
    }

    onHoverOut(/*event*/) {
        this.resetAxisColor();
    }

    getDeltaSize() {
        this._deltaSize.z = 0;
        return this._deltaSize;
    }

    getCurHandleType() {
        return this._curHandleType;
    }
}

RectangleController.HandleType = RectHandleType;
module.exports = RectangleController;
