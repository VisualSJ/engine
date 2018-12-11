'use strict';

let ControllerBase = require('./controller-base');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { gfx, create3DNode, getModel, updateVBAttr } = require('../../../utils/engine');

const vec3 = cc.vmath.vec3;

class FrustumController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._oriColor = cc.Color.WHITE;
        this._aspect = 1;
        this._near = 1;
        this._far = 10;
        this._cameraProjection = 1; // 0:ortho,1:perspective

        // for perspective
        this._fov = 30; // degree

        // for ortho
        this._orthoHeight = 0;

        this.initShape();
    }

    initShape() {
        this.createShapeNode('FrustumController');

        this._frustumNode = ControllerUtils.frustum(this._fov, this._aspect, this._near, this._far, this._oriColor);
        this._frustumNode.parent = this.shape;
        this._frustumMeshRenderer = getModel(this._frustumNode);
        this.hide();
    }

    updateSize(camProj, orthoHeight, fov, aspect, near, far) {
        this._cameraProjection = camProj;
        this._orthoHeight = orthoHeight;
        this._fov = fov;
        this._aspect = aspect;
        this._near = near;
        this._far = far;

        let positions = ControllerShape.CalcFrustum(this._cameraProjection === 0, this._orthoHeight,
            this._fov, this._aspect, this._near, this._far).vertices;
        updateVBAttr(this._frustumMeshRenderer.mesh, gfx.ATTR_POSITION, positions);

    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

}

module.exports = FrustumController;
