'use strict';

let EditableController = require('./editable-controller');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { AttributeName, getModel, updateVBAttr, setMeshColor, setNodeOpacity } = require('../../../utils/engine');
const External = require('../../../utils/external');
const EditorCamera = External.EditorCamera;

const vec3 = cc.vmath.vec3;
class BoxController extends EditableController {
    constructor(rootNode) {
        super(rootNode);

        this._color = cc.Color.WHITE;
        this._center = cc.v3();
        this._size = cc.v3(1, 1, 1);

        this._axisDir.neg_x = cc.v3(-1, 0, 0);
        this._axisDir.neg_y = cc.v3(0, -1, 0);
        this._axisDir.neg_z = cc.v3(0, 0, -1);
        this._deltaSize = cc.v3();

        this.initShape();
    }

    setColor(color) {
        if (this._wireframeBoxNode) {
            this._color = color;
            setMeshColor(this._wireframeBoxNode, color);
        }
    }

    setOpacity(opacity) {
        if (this._wireframeBoxNode) {
            setNodeOpacity(this._wireframeBoxNode, opacity);
        }
    }

    _updateEditController(axisName) {
        let node = this._axisDataMap[axisName].topNode;
        let dir = this._axisDir[axisName];

        let offset = cc.v3();
        vec3.mul(offset, dir, this._size);
        vec3.scale(offset, offset, 0.5);
        let pos = offset.add(this._center);
        let baseScale = this._editCtrlScales[axisName];
        let curScale = this.getScale();
        node.setScale(baseScale / curScale.x, baseScale / curScale.y, baseScale / curScale.z);
        node.setPosition(pos.x, pos.y, pos.z);
    }

    initShape() {
        this.createShapeNode('BoxController');

        this._wireframeBoxNode = ControllerUtils.wireframeBox(this._center, this._size, this._color, {forwardPipeline: true});
        this._wireframeBoxNode.parent = this.shape;
        this._wireframeBoxMeshRenderer = getModel(this._wireframeBoxNode);
        this.hide();

        EditorCamera._camera.node.on('transform-changed', this.onEditorCameraMoved, this);
    }

    updateSize(center, size) {
        this._center = center;
        this._size = size;

        let positions = ControllerShape.calcBoxPoints(this._center, this._size);

        updateVBAttr(this._wireframeBoxMeshRenderer, AttributeName.POSITION, positions);

        if (this._edit) {
            this.updateEditControllers();
        }

        this.adjustEditControllerSize();
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    onMouseDown(event) {
        this._mouseDeltaPos = cc.v2(0, 0);
        this._curDistScalar = super.getDistScalar();
        vec3.set(this._deltaSize, 0, 0, 0);

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

        if (event.axisName === 'x' || event.axisName === 'neg_x') {
            this._deltaSize.x = deltaDist;
        } else if (event.axisName === 'y' || event.axisName === 'neg_y') {
            this._deltaSize.y = deltaDist;
        } else if (event.axisName === 'z' || event.axisName === 'neg_z') {
            this._deltaSize.z = deltaDist;
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

    onHoverIn(event) {
        this.setAxisColor(event.axisName, ControllerUtils.YELLOW);
    }

    onHoverOut(/*event*/) {
        this.resetAxisColor();
    }

    getDeltaSize() {
        return this._deltaSize;
    }
}

module.exports = BoxController;
