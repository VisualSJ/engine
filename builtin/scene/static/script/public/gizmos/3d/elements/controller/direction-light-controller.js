'use strict';

let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const { setMeshColor } = require('../../../utils/engine');

class DirectionLightController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._color = cc.Color.WHITE;
        this.initShape();
    }

    setColor(color) {
        setMeshColor(this._lightDirNode, color);
        this._color = color;
    }

    initShape() {
        this.createShapeNode('DirectionLightController');

        // direction light
        let lightOriDir = cc.v3(0, 0, -1);
        let lightDirNode = ControllerUtils.arcDirectionLine(cc.v3(), lightOriDir,
            cc.v3(1, 0, 0), this._twoPI, 20, 100, 9, this._color);
        lightDirNode.parent = this.shape;
        this._lightDirNode = lightDirNode;

        this.hide();

        this.registerCameraMovedEvent();
    }
}

module.exports = DirectionLightController;
