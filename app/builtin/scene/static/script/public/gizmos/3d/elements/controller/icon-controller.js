'use strict';

let QuadController = require('./quad-controller');
let ControllerUtils = require('../utils/controller-utils');
const { setMaterialProperty } = require('../../../utils/engine');
const External = require('../../../utils/external');
const EditorCamera = External.EditorCamera;

class IconController extends QuadController {
    constructor(rootNode, opts) {
        super(rootNode, opts);
        this._showDist = 200;
    }

    setTexture(texture) {
        setMaterialProperty(this.quadNode, 'mainTexture', texture);
    }

    setTextureByUuid(uuid) {
        cc.AssetLibrary.loadAsset(uuid, (err, img) => {
            if (img) {
                this.setTexture(img);
            }
        });
    }

    onEditorCameraMoved() {
        super.onEditorCameraMoved();

        let cameraNode = EditorCamera._camera.node;
        let dist = ControllerUtils.getCameraDistanceFactor(this.getPosition(), cameraNode);

        if (dist > this._showDist) {
            this.quadNode.active = false;
        } else {
            this.quadNode.active = true;
        }
    }
}

module.exports = IconController;
