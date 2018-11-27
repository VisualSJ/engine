'use strict';

let ControllerBase = require('./controller-base');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const NodeUtils = require('../../../../utils/node');
const { gfx, create3DNode, getModel, updateVBAttr } = require('../../engine');

const vec3 = cc.vmath.vec3;

class SphereController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._oriColor = new cc.Color(180, 176, 114);
        this._center = cc.v3();
        this._radius = 100;

        this.initShape();
    }

    get radius() { return this._radius; }
    set radius(value) {
        this.updateSize(this._center, value);
    }

    createCircleByAxis(axisName, fromAxisName, color) {
        let normalDir = this._axisDir[axisName];
        let fromDir = this._axisDir[fromAxisName];
        let circleNode = ControllerUtils.arc(this._center, normalDir, fromDir,
            Math.PI * 2, this._radius, color);
        circleNode.parent = this.shape;

        let axisData = {};
        axisData.arcMeshRenderer = getModel(circleNode);
        axisData.normalDir = normalDir;
        axisData.fromDir = fromDir;
        this._circleDataMap[axisName] = axisData;
    }

    initShape() {
        this.createShapeNode('SphereController');

        this._circleDataMap = {};

        this.createCircleByAxis('x', 'z', this._oriColor);
        this.createCircleByAxis('y', 'x', this._oriColor);
        this.createCircleByAxis('z', 'x', this._oriColor);

        this.hide();
    }

    updateSize(center, radius) {
        this._center = center ? center : this._center;
        this._radius = radius ? radius : this._radius;

        Object.keys(this._circleDataMap).forEach((key) => {
            let arcPositions = ControllerShape.CalcArcPoints(
                this._center, this._circleDataMap[key].normalDir,
                this._circleDataMap[key].fromDir, Math.PI * 2, this._radius
            );
            updateVBAttr(this._circleDataMap[key].arcMeshRenderer.mesh, gfx.ATTR_POSITION, arcPositions);
        });
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }
}

module.exports = SphereController;
