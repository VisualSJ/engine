'use strict';

let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');

class DirectionLightController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this.initShape();
    }

    initShape() {
        this.createShapeNode('DirectionLightController');

        let oriLightColor = new cc.Color(180, 176, 114);

        // direction light
        let lightOriDir = cc.v3(0, 0, -1);
        let lightDirNode = ControllerUtils.arcDirectionLine(cc.v3(), lightOriDir,
            cc.v3(1, 0, 0), this._twoPI, 20, 100, 9, oriLightColor);
        lightDirNode.parent = this.shape;

        this.hide();
    }
}

module.exports = DirectionLightController;
