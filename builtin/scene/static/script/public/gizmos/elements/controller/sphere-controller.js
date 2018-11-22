'use strict';

let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const NodeUtils = require('../../../../utils/node');
const { create3DNode, getModel, updateVBAttr } = require('../../engine');

const vec3 = cc.vmath.vec3;

class SphereController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._radius = 10;

        this.initShape();
    }

    get radius() { return this._radius; }
    set radius(value) { this._radius = value; }

    initShape() {
        this.createShapeNode('SphereController');

        let oriLightColor = new cc.Color(180, 176, 114);

        // point light
        let pointNode = create3DNode('Point Node');
        pointNode.parent = this.shape;

        let arcUpNode = ControllerUtils.arc(cc.v3(), cc.v3(0, 1, 0), cc.v3(1, 0, 0),
            Math.PI * 2, this._radius, oriLightColor);
        let arcForwardNode = ControllerUtils.arc(cc.v3(), cc.v3(0, 0, 1), cc.v3(1, 0, 0),
            Math.PI * 2, this._radius, oriLightColor);
        arcUpNode.parent = pointNode;
        arcForwardNode.parent = pointNode;

    }

    updateSize() {

    }
}

module.exports = SphereController;
