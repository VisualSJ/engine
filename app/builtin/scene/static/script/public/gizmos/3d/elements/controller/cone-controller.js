'use strict';

let EditableController = require('./editable-controller');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { AttributeName, setMeshColor, getModel, updateVBAttr } = require('../../../utils/engine');

const vec3 = cc.vmath.vec3;
let tempVec3 = cc.v3();

class ConeController extends EditableController {
    constructor(rootNode) {
        super(rootNode);

        this._oriDir = cc.v3(0, 0, -1);
        this._color = cc.Color.WHITE;
        this._center = cc.v3();
        this._radius = 100;
        this._height = 100;

        delete this._axisDir.z; // don't need z axis
        this._axisDir.neg_x = cc.v3(-1, 0, 0);
        this._axisDir.neg_y = cc.v3(0, -1, 0);
        this._axisDir.neg_z = cc.v3(0, 0, -1);
        this._deltaRadius = 0;
        this._deltaHeight = 0;

        this.initShape();
    }

    get radius() { return this._radius; }
    set radius(value) {
        this.updateSize(this._center, value, this._height);
    }

    get height() { return this._height; }
    set height(value) {
        this.updateSize(this._center, this._radius, value);
    }

    setColor(color) {
        setMeshColor(this._coneLineNode, color);
        setMeshColor(this._circleNode, color);

        this.setEditCtrlColor(color);

        this._color = color;
    }

    _updateEditController(axisName) {
        let node = this._axisDataMap[axisName].topNode;
        let dir = this._axisDir[axisName];

        let offset = cc.v3();
        vec3.scale(offset, this._oriDir, this._height);

        if (axisName !== 'neg_z') {
            vec3.scale(tempVec3, dir, this._radius);
            offset = offset.add(tempVec3);
        }
        let pos = offset.add(this._center);
        node.setPosition(pos);
    }

    initShape() {
        this.createShapeNode('ConeController');

        this._circleFromDir = cc.v3(1, 0, 0);
        // for cone line
        let lineData = this.getConeLineData();
        let coneLineNode = ControllerUtils.lines(lineData.vertices, lineData.indices, this._color);
        coneLineNode.parent = this.shape;
        this._coneLineNode = coneLineNode;
        this._coneLineMR = getModel(coneLineNode);

        // for circle
        let circleNode = ControllerUtils.arc(this._center, this._oriDir,
            this._circleFromDir, this._twoPI, this._radius, this._color);
        circleNode.parent = this.shape;
        let pos = cc.v3();
        vec3.scale(pos, this._oriDir, this._height);
        circleNode.setPosition(pos.x, pos.y, pos.z);
        this._circleNode = circleNode;
        this._circleMR = getModel(circleNode);

        this.hide();
    }

    getConeLineData() {
        let vertices = [];
        let indices = [];

        let arcPoints = ControllerShape.calcArcPoints(this._center, this._oriDir,
            this._circleFromDir, this._twoPI, this._radius, 5);
        arcPoints = arcPoints.slice(0, arcPoints.length - 1);

        let offset = cc.v3();
        vec3.scale(offset, this._oriDir, this._height);

        // center point
        vertices.push(this._center);
        for (let i = 0; i < arcPoints.length; i++) {
            let endPoint = cc.v3();
            vec3.add(endPoint, arcPoints[i], offset);

            vertices.push(endPoint);
            indices.push(0, i + 1);
        }

        return { vertices: vertices, indices: indices };
    }

    updateSize(center, radius, height) {
        this._center = center;
        this._radius = radius;
        this._height = height;

        // update cone line
        let lineData = this.getConeLineData();
        updateVBAttr(this._coneLineMR, AttributeName.POSITION, lineData.vertices);

        // update circle
        let circlePoints = ControllerShape.calcArcPoints(
            this._center, this._oriDir,
            this._circleFromDir, this._twoPI, this._radius
        );
        updateVBAttr(this._circleMR, AttributeName.POSITION, circlePoints);
        let pos = cc.v3();
        vec3.scale(pos, this._oriDir, this._height);
        this._circleNode.setPosition(pos.x, pos.y, pos.z);

        if (this._edit) {
            this.updateEditControllers();
        }

        this.adjustEditControllerSize();
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    // mouse events
    onMouseDown(event) {
        this._mouseDeltaPos = cc.v2(0, 0);
        this._curDistScalar = super.getDistScalar();
        this._deltaRadius = 0;
        this._deltaHeight = 0;

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        this._mouseDeltaPos.x += event.moveDeltaX;
        this._mouseDeltaPos.y += event.moveDeltaY;

        let axisDir = this._axisDir[event.axisName];

        let deltaDist = this.getAlignAxisMoveDistance(this.localToWorldDir(axisDir),
        this._mouseDeltaPos) * this._curDistScalar;
        if (event.axisName === 'neg_z') {
            this._deltaHeight = deltaDist;
        } else {
            this._deltaRadius = deltaDist;
        }

        if (this.onControllerMouseMove != null) {
            this.onControllerMouseMove(event);
        }
    }

    onMouseUp(event) {

        if (this.onControllerMouseUp != null) {
            this.onControllerMouseUp();
        }
    }

    onMouseLeave() {
        this.onMouseUp();
    }
    // mouse events end

    getDeltaRadius() {
        return this._deltaRadius;
    }

    getDeltaHeight() {
        return this._deltaHeight;
    }
}

module.exports = ConeController;
