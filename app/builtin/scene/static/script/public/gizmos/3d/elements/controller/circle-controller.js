'use strict';

let EditableController = require('./editable-controller');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { AttributeName, setMeshColor, getModel, updateVBAttr } = require('../../../utils/engine');

const vec3 = cc.vmath.vec3;
let tempVec3 = cc.v3();

class CircleController extends EditableController {
    constructor(rootNode) {
        super(rootNode);

        this._oriDir = cc.v3(0, 0, -1);
        this._color = cc.Color.WHITE;
        this._center = cc.v3();
        this._radius = 100;
        this._arc = 360;

        delete this._axisDir.z; // don't need z axis
        this._axisDir.neg_x = cc.v3(-1, 0, 0);
        this._axisDir.neg_y = cc.v3(0, -1, 0);
        this._deltaRadius = 0;

        this.initShape();
    }

    get radius() { return this._radius; }
    set radius(value) {
        this.updateSize(this._center, value);
    }

    setColor(color) {
        setMeshColor(this._circleNode, color);

        this.setEditCtrlColor(color);

        this._color = color;
    }

    _updateEditController(axisName) {
        let node = this._axisDataMap[axisName].topNode;
        let dir = this._axisDir[axisName];

        let offset = cc.v3();
        vec3.scale(tempVec3, dir, this._radius);
        offset = offset.add(tempVec3);

        let pos = offset.add(this._center);
        node.setPosition(pos);
    }

    initShape() {
        this.createShapeNode('CircleController');

        this._circleFromDir = cc.v3(1, 0, 0);

        // for circle
        let circleNode = ControllerUtils.arc(this._center, this._oriDir,
            this._circleFromDir, this._twoPI, this._radius, this._color);
        circleNode.parent = this.shape;

        this._circleNode = circleNode;
        this._circleMR = getModel(circleNode);

        this.hide();
    }

    updateSize(center, radius, arc) {
        this._center = center;
        this._radius = radius;
        this._arc = arc;

        // update circle
        let circlePoints = ControllerShape.calcArcPoints(
            this._center, this._oriDir,
            this._circleFromDir, -this._arc * this._degreeToRadianFactor, this._radius
        );
        updateVBAttr(this._circleMR, AttributeName.POSITION, circlePoints);

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
        this._controlDir = cc.v3();

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        this._mouseDeltaPos.x += event.moveDeltaX;
        this._mouseDeltaPos.y += event.moveDeltaY;

        let axisDir = this._axisDir[event.axisName];
        this._controlDir = axisDir;

        let deltaDist = this.getAlignAxisMoveDistance(this.localToWorldDir(axisDir),
        this._mouseDeltaPos) * this._curDistScalar;

        this._deltaRadius = deltaDist;

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

module.exports = CircleController;
