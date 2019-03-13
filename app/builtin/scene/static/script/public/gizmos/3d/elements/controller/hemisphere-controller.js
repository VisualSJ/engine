'use strict';

let EditableController = require('./editable-controller');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { AttributeName, getModel, updateVBAttr, setMeshColor} = require('../../../utils/engine');
const External = require('../../../utils/external');
const MathUtil = External.EditorMath;

const vec3 = cc.vmath.vec3;

class SphereController extends EditableController {
    constructor(rootNode) {
        super(rootNode);

        this._color = cc.Color.WHITE;
        this._center = cc.v3();
        this._radius = 100;

        delete this._axisDir.z; // don't need z axis
        this._axisDir.neg_x = cc.v3(-1, 0, 0);
        this._axisDir.neg_y = cc.v3(0, -1, 0);
        this._axisDir.neg_z = cc.v3(0, 0, -1);
        this._deltaRadius = 0;

        this.initShape();
    }

    get radius() { return this._radius; }
    set radius(value) {
        this.updateSize(this._center, value);
    }

    setColor(color) {
        Object.keys(this._circleDataMap).forEach((key) => {
            let curData = this._circleDataMap[key];
            setMeshColor(curData.arcMR.node, color);
        });
        this.setEditCtrlColor(color);
        this._color = color;
    }

    createCircleByAxis(axisName, fromAxisName, color) {
        let normalDir = this._axisDir[axisName];
        let fromDir = this._axisDir[fromAxisName];
        let rad = Math.PI;
        if (axisName === 'neg_z') {
            rad = MathUtil.TWO_PI;
        }
        let arcNode = ControllerUtils.arc(this._center, normalDir, fromDir,
            rad, this._radius, color);
        arcNode.parent = this.shape;

        let axisData = {};
        axisData.arcMR = getModel(arcNode);
        axisData.normalDir = normalDir;
        axisData.fromDir = fromDir;
        this._circleDataMap[axisName] = axisData;
    }

    _updateEditController(axisName) {
        let node = this._axisDataMap[axisName].topNode;
        let dir = this._axisDir[axisName];

        let offset = cc.v3();
        vec3.scale(offset, dir, this._radius);
        let pos = offset.add(this._center);
        node.setPosition(pos.x, pos.y, pos.z);
    }

    initShape() {
        this.createShapeNode('SphereController');

        this._circleDataMap = {};

        this.createCircleByAxis('x', 'neg_y', this._color);
        this.createCircleByAxis('y', 'x', this._color);
        this.createCircleByAxis('neg_z', 'x', this._color);

        this.hide();
    }

    updateSize(center, radius) {
        this._center = center;
        this._radius = radius;

        Object.keys(this._circleDataMap).forEach((key) => {
            let normalDir = this._circleDataMap[key].normalDir;
            let fromDir = this._circleDataMap[key].fromDir;
            let arcMR = this._circleDataMap[key].arcMR;
            let rad = Math.PI;
            if (key === 'neg_z') {
                rad = MathUtil.TWO_PI;
            }
            this.updateArcMesh(arcMR, this._center,
                normalDir, fromDir, rad, this._radius);
        });

        if (this._edit) {
            this.updateEditControllers();
        }

        this.adjustEditControllerSize();
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    updateArcMesh(model, center, normal, from, radian, radius) {
        let arcPositions = ControllerShape.calcArcPoints(
            center, normal, from, radian, radius
        );

        updateVBAttr(model, AttributeName.POSITION, arcPositions);
    }

    // mouse events
    onMouseDown(event) {
        this._mouseDeltaPos = cc.v2(0, 0);
        this._curDistScalar = super.getDistScalar();
        this._controlDir = cc.v3(0, 0, 0);

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        this._mouseDeltaPos.x += event.moveDeltaX;
        this._mouseDeltaPos.y += event.moveDeltaY;

        let axisDir = this._axisDir[event.axisName];
        this._controlDir = axisDir;
        this._deltaRadius = this.getAlignAxisMoveDistance(this.localToWorldDir(axisDir),
            this._mouseDeltaPos) * this._curDistScalar;

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

    getControlDir() {
        return this._controlDir;
    }
}

module.exports = SphereController;
