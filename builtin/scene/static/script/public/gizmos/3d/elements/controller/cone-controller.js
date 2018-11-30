'use strict';

let ControllerBase = require('./controller-base');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { gfx, create3DNode, getModel, updateVBAttr } = require('../../../utils/engine');

const vec3 = cc.vmath.vec3;

class ConeController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._oriDir = cc.v3(0, 0, -1);
        this._oriColor = new cc.Color(180, 176, 114);
        this._center = cc.v3();
        this._radius = 100;
        this._height = 100;

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

    initShape() {
        this.createShapeNode('ConeController');

        this._circleFromDir = cc.v3(1, 0, 0);
        // for cone line
        let lineData = this.getConeLineData();
        let coneLineNode = ControllerUtils.lines(lineData.vertices, lineData.indices, this._oriColor);
        coneLineNode.parent = this.shape;
        this._coneLineMR = getModel(coneLineNode);

        // for circle
        let circleNode = ControllerUtils.arc(this._center, this._oriDir,
            this._circleFromDir, this._twoPI, this._radius, this._oriColor);
        circleNode.parent = this.shape;
        let pos = cc.v3();
        vec3.scale(pos, this._oriDir, this._height);
        circleNode.setPosition(pos.x, pos.y, pos.z);
        this._circleNode = circleNode;
        this._circleMR = getModel(circleNode);

    }

    getConeLineData() {
        let vertices = [];
        let indices = [];

        let arcPoints = ControllerShape.CalcArcPoints(this._center, this._oriDir,
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
        this._center = center ? center : this._center;
        this._radius = radius ? radius : this._radius;
        this._height = height ? height : this._height;

        // update cone line
        let lineData = this.getConeLineData();
        updateVBAttr(this._coneLineMR.mesh, gfx.ATTR_POSITION, lineData.vertices);

        // update circle
        let circlePoints = ControllerShape.CalcArcPoints(
            this._center, this._oriDir,
            this._circleFromDir, this._twoPI, this._radius
        );
        updateVBAttr(this._circleMR.mesh, gfx.ATTR_POSITION, circlePoints);
        let pos = cc.v3();
        vec3.scale(pos, this._oriDir, this._height);
        this._circleNode.setPosition(pos.x, pos.y, pos.z);
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }
}

module.exports = ConeController;
