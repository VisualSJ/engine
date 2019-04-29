'use strict';

let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const EditorCamera = External.EditorCamera;

const vec3 = cc.vmath.vec3;

class WorldAxisController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);
        this.initShape();
    }

    createAxis(axisName, color, rotation) {
        // let baseArrowHeadHeight = 5;
        // let baseArrowHeadRadius = 2;
        let baseArrowBodyHeight = 28;

        // let axisNode = ControllerUtils.arrow(baseArrowHeadHeight, baseArrowHeadRadius,
        //     baseArrowBodyHeight, color, axisName + 'Axis');
        let axisNode = ControllerUtils.lineTo(cc.v3(), cc.v3(0, baseArrowBodyHeight, 0),
            color, { noDepthTestForLines: true });
        axisNode.name = axisName + 'Axis';
        axisNode.parent = this.shape;
        NodeUtils.setEulerAngles(axisNode, rotation);
    }

    initShape() {
        this.createShapeNode('WorldAxisController');

        // x axis
        this.createAxis('x', cc.Color.RED, cc.v3(-90, -90, 0));

        // y axis
        this.createAxis('y', cc.Color.GREEN, cc.v3());

        // z axis
        this.createAxis('z', cc.Color.BLUE, cc.v3(90, 0, 90));

        this.registerCameraMovedEvent();
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    onEditorCameraMoved() {
        let camera = EditorCamera._camera._camera;
        let screenPos = cc.v3(30, 30, 0.1);
        let worldPos = cc.v3();
        if (camera) {
            camera.update();
            camera.screenToWorld(worldPos, screenPos, cc.winSize.width, cc.winSize.height);
        }
        this.setPosition(worldPos);
    }
}

module.exports = WorldAxisController;
