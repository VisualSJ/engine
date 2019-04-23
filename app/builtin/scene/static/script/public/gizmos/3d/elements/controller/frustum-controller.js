'use strict';

let EditableController = require('./editable-controller');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { AttributeName, setNodeOpacity, getModel, updateVBAttr } = require('../../../utils/engine');
const External = require('../../../utils/external');
const MathUtil = External.EditorMath;

const vec3 = cc.vmath.vec3;
let tempVec3 = cc.v3();
class FrustumController extends EditableController {
    constructor(rootNode) {
        super(rootNode);

        this._color = cc.Color.WHITE;
        this._aspect = 1;
        this._near = 1;
        this._far = 10;
        this._cameraProjection = 1; // 0:ortho,1:perspective

        // for perspective
        this._fov = 30; // degree

        // for ortho
        this._orthoHeight = 0;

        // for edit
        this._oriDir = cc.v3(0, 0, -1);
        delete this._axisDir.z; // don't need z axis
        this._axisDir.neg_x = cc.v3(-1, 0, 0);
        this._axisDir.neg_y = cc.v3(0, -1, 0);
        this._axisDir.neg_z = cc.v3(0, 0, -1);
        this._deltaWidth = 0;
        this._deltaHeight = 0;
        this._deltaDistance = 0;

        this.initShape();
    }

    getFarClipSize(isOrtho, orthoHeight, fov, aspect, far) {
        let farHalfHeight;
        let farHalfWidth;

        if (isOrtho) {
            farHalfHeight = orthoHeight / 2;
            farHalfWidth = farHalfHeight * aspect;
        } else {
            farHalfHeight = Math.tan(MathUtil.deg2rad(fov / 2)) * far;
            farHalfWidth = farHalfHeight * aspect;
        }

        return {farHalfHeight: farHalfHeight, farHalfWidth: farHalfWidth};
    }

    _updateEditController(axisName) {
        let node = this._axisDataMap[axisName].topNode;
        let dir = this._axisDir[axisName];

        let offset = cc.v3();
        vec3.scale(offset, this._oriDir, this._far);

        if (axisName !== 'neg_z') {
            let data = this.getFarClipSize(this._cameraProjection === 0,
                this._orthoHeight, this._fov, this._aspect, this._far);

            if (axisName === 'x' || axisName === 'neg_x') {
                vec3.scale(tempVec3, dir, data.farHalfWidth);
            } else if (axisName === 'y' || axisName === 'neg_y') {
                vec3.scale(tempVec3, dir, data.farHalfHeight);
            }
            offset = offset.add(tempVec3);
        }
        //let pos = offset.add(this._center);
        node.setPosition(offset);
    }

    initShape() {
        this.createShapeNode('FrustumController');

        this._frustumNode = ControllerUtils.frustum(this._fov, this._aspect,
            this._near, this._far, this._color, {forwardPipeline: true});
        setNodeOpacity(this._frustumNode, 150);
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

        let positions = ControllerShape.calcFrustum(this._cameraProjection === 0, this._orthoHeight,
            this._fov, this._aspect, this._near, this._far).vertices;
        updateVBAttr(this._frustumMeshRenderer, AttributeName.POSITION, positions);

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
        let hitNodePos = cc.v3();
        event.node.getWorldPosition(hitNodePos);
        this._curDistScalar = this.getCameraDistScalar(hitNodePos);
        this._deltaWidth = 0;
        this._deltaHeight = 0;
        this._deltaDistance = 0;

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
            this._deltaDistance = deltaDist;
        } else if (event.axisName === 'x' || event.axisName === 'neg_x') {
            this._deltaWidth = deltaDist;
        } else if (event.axisName === 'y' || event.axisName === 'neg_y') {
            this._deltaHeight = deltaDist;
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

    getDeltaWidth() {
        return this._deltaWidth;
    }

    getDeltaHeight() {
        return this._deltaHeight;
    }

    getDeltaDistance() {
        return this._deltaDistance;
    }

}

module.exports = FrustumController;
