'use strict';

let ControllerBase = require('./controller-base');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { gfx, create3DNode, getModel, updateVBAttr, setMeshColor, setNodeOpacity } = require('../../../utils/engine');

const vec3 = cc.vmath.vec3;

class BoxController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._color = cc.Color.WHITE;
        this._center = cc.v3();
        this._size = cc.v3(1, 1, 1);

        this._edit = false;
        this._editControllerShape = null;

        this.initShape();
    }

    get edit() { return this._edit; }
    set edit(value) {
        this._edit = value;
        if (this._edit === true) {
            this.initEditController();
            this._editControllerShape.active = true;
        } else {
            if (this._editControllerShape) {
                this._editControllerShape.active = false;
            }
        }
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

    createMidController(faceName, color) {
        let cubeNode = ControllerUtils.cube(1, 1, 1, color, faceName);
        cubeNode.parent = this._editControllerShape;
        let dir = this._faceDirMap[faceName];
        this.updateMidControllerTransform(cubeNode, dir);
        this.initAxis(cubeNode, faceName, color);
    }

    updateMidControllerTransform(node, dir) {
        let offset = cc.v3();
        vec3.mul(offset, dir, this._size);
        vec3.scale(offset, offset, 0.5);
        let pos = offset.add(this._center);
        node.setScale(1 / this._scale.x, 1 / this._scale.y, 1 / this._scale.z);
        node.setPosition(pos.x, pos.y, pos.z);
    }

    _updateMidController(faceName) {
        let node = this._axisDataMap[faceName].topNode;
        let dir = this._faceDirMap[faceName];
        this.updateMidControllerTransform(node, dir);
    }

    initEditController() {
        if (!this._editControllerShape) {
            this._editControllerShape = create3DNode('EditControllerShape');
            this._editControllerShape.parent = this.shape;

            this._faceDirMap = {};
            this._faceDirMap.up = cc.v3(0, 1, 0);
            this._faceDirMap.down = cc.v3(0, -1, 0);
            this._faceDirMap.left = cc.v3(-1, 0, 0);
            this._faceDirMap.right = cc.v3(1, 0, 0);
            this._faceDirMap.forward = cc.v3(0, 0, -1);
            this._faceDirMap.backward = cc.v3(0, 0, 1);

            Object.keys(this._faceDirMap).forEach((key) => {
                this.createMidController(key, cc.Color.GREEN);
            });
        }
    }

    initShape() {
        this.createShapeNode('BoxController');

        this._wireframeBoxNode = ControllerUtils.wireframeBox(this._center, this._size, this._color);
        this._wireframeBoxNode.parent = this.shape;
        this._wireframeBoxMeshRenderer = getModel(this._wireframeBoxNode);
        this.hide();

        if (this._edit) {
            this.initEditController();
        }
    }

    updateSize(center, size) {
        this._center = center;
        this._size = size;

        let positions = ControllerShape.calcBoxPoints(this._center, this._size);

        updateVBAttr(this._wireframeBoxMeshRenderer.mesh, gfx.ATTR_POSITION, positions);

        if (this._edit) {
            this.updateMidControllers();
        }
    }

    updateMidControllers() {

        Object.keys(this._faceDirMap).forEach((key) => {
            this._updateMidController(key);
        });
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    onMouseDown(event) {
        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
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

}

module.exports = BoxController;
