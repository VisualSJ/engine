'use strict';

let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const { setMeshTexture } = require('../../../utils/engine');
const External = require('../../../utils/external');
const EditorCamera = External.EditorCamera;

let tempVec3 = cc.v3();

class IconController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);
        this._iconNode = null;
        this._defaultIconSize = 2;
        this._hoverColor = cc.Color.GREEN;
        this._showDist = 200;

        this.initShape();

        EditorCamera._camera.node.on('transform-changed', this.onEditorCameraMoved, this);
    }

    get hoverColor() { return this._hoverColor; }
    set hoverColor(value) {
        this._hoverColor = value;
    }

    setTexture(texture) {
        setMeshTexture(this._iconNode, texture);
    }

    setTextureByUuid(uuid) {
        cc.AssetLibrary.loadAsset(uuid, (err, img) => {
            if (img) {
                this.setTexture(img);
            }
        });
    }

    initShape() {
        this.createShapeNode('IconController');
        let quadNode = ControllerUtils.quad(cc.v3(), this._defaultIconSize,
        this._defaultIconSize, cc.Color.WHITE, {texture: true});
        quadNode.parent = this.shape;
        this._iconNode = quadNode;
        this.registerMouseEvents(this._iconNode, 'icon');
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
        //this.setAxisColor(event.axisName, this.hoverColor);
    }

    onHoverOut(/*event*/) {
        //this.resetAxisColor();
    }

    onEditorCameraMoved() {
        // face ctrl to camera
        let cameraNode = EditorCamera._camera.node;
        let cameraRot = cc.quat();
        cameraNode.getWorldRotation(cameraRot);
        this._iconNode.setWorldRotation(cameraRot);

        let dist = ControllerUtils.getCameraDistanceFactor(this.getPosition(), cameraNode);

        if (dist > this._showDist) {
            this._iconNode.active = false;
        } else {
            this._iconNode.active = true;
        }
    }

    onShow() {
        this.onEditorCameraMoved();
    }
}

module.exports = IconController;
