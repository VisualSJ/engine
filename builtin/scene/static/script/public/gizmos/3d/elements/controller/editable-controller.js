'use strict';

let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const { create3DNode, setMeshColor } = require('../../../utils/engine');
const External = require('../../../utils/external');
const EditorCamera = External.EditorCamera;

let tempVec3 = cc.v3();

class EditableController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._editable = false;     //是否Controller是可编辑的
        this._edit = false;     //是否开启Controller的编辑
        this._editControllerShape = null;
        this._defaultEditCtrlSize = 5;
        this._hoverColor = cc.Color.GREEN;
        this._editCtrlScales = {};

        EditorCamera._camera.node.on('transform-changed', this.onEditorCameraMoved, this);
    }

    get editable() { return this._editable; }
    set editable(value) { this._editable = value; }

    get edit() { return this._edit; }
    set edit(value) {
        if (this._editable) {
            this._edit = value;
            if (this._edit === true) {
                this.initEditController();
                this._editControllerShape.active = true;
            } else {
                this.hideEditController();
            }
        }
    }

    get hoverColor() { return this._hoverColor; }
    set hoverColor(value) {
        this._hoverColor = value;
    }

    createEditControllerShape() {
        this._editControllerShape = create3DNode('EditControllerShape');
        this._editControllerShape.parent = this.shape;
    }

    setEditCtrlColor(color) {
        // set edit controller color
        if (this.editable && this.edit) {
            Object.keys(this._axisDir).forEach((key) => {
                let axisData = this._axisDataMap[key];
                if (axisData) {
                    let node = axisData.topNode;
                    setMeshColor(node, color);
                }
            });
        }
    }

    hideEditController() {
        if (this._editControllerShape) {
            this._editControllerShape.active = false;
        }
    }

    createEditController(axisName, color) {
        let ctrlSize = this._defaultEditCtrlSize;
        let editCtrlNode = ControllerUtils.quad(ctrlSize, ctrlSize, color, axisName, {unlit : true});
        editCtrlNode.parent = this._editControllerShape;
        this._editCtrlScales[axisName] = cc.v3(1, 1, 1);
        this.initAxis(editCtrlNode, axisName);
        this._updateEditController(axisName);
    }

    initEditController() {
        if (!this._editControllerShape) {
            this.createEditControllerShape();

            Object.keys(this._axisDir).forEach((key) => {
                this.createEditController(key, this._color);
            });
        }
    }

    _updateEditController(axisName) {
    }

    updateEditControllers() {
        Object.keys(this._axisDir).forEach((key) => {
            this._updateEditController(key);
        });
    }

    checkEdit() {
        if (this.editable) {
            this.edit = true;
        } else {
            this.hideEditController();
        }
    }

    onHoverIn(event) {
        this.setAxisColor(event.axisName, this.hoverColor);
    }

    onHoverOut(/*event*/) {
        this.resetAxisColor();
    }

    onEditorCameraMoved() {
        this.adjustEditControllerSize();
    }

    adjustEditControllerSize() {
        if (this.edit) {
            Object.keys(this._axisDir).forEach((key) => {
                let axisData = this._axisDataMap[key];
                if (axisData) {
                    let node = axisData.topNode;
                    node.getWorldPosition(tempVec3);
                    let scalar = this.getCameraDistScalar(tempVec3);
                    this._editCtrlScales[this._axisDir] = scalar;
                    node.setScale(cc.v3(scalar / this._scale.x, scalar / this._scale.y, scalar / this._scale.z));

                    // face edit ctrl to camera
                    EditorCamera._camera.node.getWorldPosition(tempVec3);
                    node.lookAt(tempVec3);
                }
            });
        }
    }
}

module.exports = EditableController;
