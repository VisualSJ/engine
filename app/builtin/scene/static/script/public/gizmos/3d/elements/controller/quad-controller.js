'use strict';

let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const { setMaterialProperty } = require('../../../utils/engine');
const External = require('../../../utils/external');
const EditorCamera = External.EditorCamera;

let tempVec3 = cc.v3();

class QuadController extends ControllerBase {
    constructor(rootNode, opts) {
        super(rootNode);
        this.quadNode = null;
        this._defaultSize = 1;
        this._hoverColor = cc.Color.GREEN;

        this.initShape(opts);

        EditorCamera._camera.node.on('transform-changed', this.onEditorCameraMoved, this);
    }

    get hoverColor() { return this._hoverColor; }
    set hoverColor(value) {
        this._hoverColor = value;
    }

    initShape(opts) {
        this.createShapeNode('QuadController');
        let size = this._defaultSize;
        if (opts) {
            if (opts.size) {
                size = opts.size;
                this._defaultSize = size;
            }
        }
        let quadNode = ControllerUtils.quad(cc.v3(), size,
        size, cc.Color.WHITE, opts);
        quadNode.parent = this.shape;
        this.quadNode = quadNode;
        this.registerMouseEvents(this.quadNode, 'quad');
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    // mouse events
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

    onHoverIn(event) {
    }

    onHoverOut(/*event*/) {
    }

    onEditorCameraMoved() {
        // face ctrl to camera
        let cameraNode = EditorCamera._camera.node;
        let cameraRot = cc.quat();
        cameraNode.getWorldRotation(cameraRot);
        this.quadNode.setWorldRotation(cameraRot);
    }

    onShow() {
        this.onEditorCameraMoved();
    }

    updateSize(size) {
        let scale = size / this._defaultSize;
        this.quadNode.setScale(cc.v3(scale, scale, scale));
    }

    setMaterialProperty(name, value) {
        setMaterialProperty(this.quadNode, name, value);
    }
}

module.exports = QuadController;
