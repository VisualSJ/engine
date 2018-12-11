'use strict';
const vec3 = cc.vmath.vec3;
let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;

class ScaleController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._deltaScale = cc.v3(0, 0, 0);
        this._scaleFactor = 125;
        this.initShape();
    }

    initShape() {
        this.createShapeNode('ScaleController');
        this.registerSizeChangeEvents();

        let baseCubeSize = 25;
        let axisLength = 140;
        this._baseCubeSize = baseCubeSize;
        this._baseAxisLength = axisLength;
        this._axisSliderNodes = {};

        let xSliderNode = ControllerUtils.scaleSlider(baseCubeSize, axisLength, cc.Color.RED, 'xSlider');
        xSliderNode.parent = this.shape;
        NodeUtils.setEulerAngles(xSliderNode, cc.v3(-90, -90, 0));
        this.initAxis(xSliderNode, 'x', cc.Color.RED);

        let ySliderNode = ControllerUtils.scaleSlider(baseCubeSize, axisLength, cc.Color.GREEN, 'ySlider');
        ySliderNode.parent = this.shape;
        this.initAxis(ySliderNode, 'y', cc.Color.GREEN);

        let zSliderNode = ControllerUtils.scaleSlider(baseCubeSize, axisLength, cc.Color.BLUE, 'zSlider');
        zSliderNode.parent = this.shape;
        NodeUtils.setEulerAngles(zSliderNode, cc.v3(90, 0, 90));
        this.initAxis(zSliderNode, 'z', cc.Color.BLUE);

        let xyzNode = ControllerUtils.cube(baseCubeSize, baseCubeSize, baseCubeSize, cc.Color.GRAY, 'xyzScale');
        xyzNode.parent = this.shape;
        this._axisDir.xyz = cc.v3(1, 1, 1);    // only for scale
        this.initAxis(xyzNode, 'xyz', cc.Color.GRAY);

        this.shape.active = false;
    }

    onInitAxis(node, axisName) {
        if (axisName === 'xyz') {
            return;
        }

        let sliderNodeData = {};
        sliderNodeData.head = node.getChildByName('ScaleSliderHead');
        sliderNodeData.body = node.getChildByName('ScaleSliderBody');

        this._axisSliderNodes[axisName] = sliderNodeData;
    }

    onAxisSliderMove(axisName, deltaDist) {

        for (let i = 0; i < axisName.length; i++) {
            let singleAxisName = axisName.charAt(i);
            if (singleAxisName == null) {
                return;
            }

            let head = this._axisSliderNodes[singleAxisName].head;
            let body = this._axisSliderNodes[singleAxisName].body;

            let newLength = this._baseAxisLength + deltaDist;
            let scale = newLength / this._baseAxisLength;

            body.setScale(scale, 1, 1);
            head.setPosition(0, newLength, 0);
        }
    }

    getAlignAxisDeltaScale(axisName, curMouseDeltaPos) {
        let axisDir = this._axisDir[axisName];
        let alignAxisMoveDist = this.getAlignAxisMoveDistance(this.localToWorldPosition(axisDir), curMouseDeltaPos);

        let deltaScale = cc.v3();
        let deltaDist = alignAxisMoveDist / this._scaleFactor;
        vec3.scale(deltaScale, axisDir, deltaDist);

        this.onAxisSliderMove(axisName, alignAxisMoveDist);

        return deltaScale;
    }

    onMouseDown(event) {
        this._deltaScale = cc.v3(0, 0, 0);
        this._mouseDeltaPos = cc.v2(0, 0);
        cc.game.canvas.style.cursor = 'pointer';
        this._moveAxisName = event.axisName;

        this.onAxisSliderMove(event.axisName, 0);

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        this._mouseDeltaPos.x += event.moveDeltaX;
        this._mouseDeltaPos.y += event.moveDeltaY;

        vec3.set(this._deltaScale, 0, 0, 0);

        this._deltaScale = this.getAlignAxisDeltaScale(event.axisName, this._mouseDeltaPos);

        if (this.onControllerMouseMove != null) {
            this.onControllerMouseMove(event);
        }

        this.updateController();
    }

    onMouseUp(event) {
        cc.game.canvas.style.cursor = 'default';
        this.onAxisSliderMove(this._moveAxisName, 0);

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

    getDeltaScale() {
        return this._deltaScale;
    }

    onShow() {
        if (this.is2D) {
            this._axisDataMap.z.topNode.active = false;
            this.updateController();
        } else {
            this._axisDataMap.z.topNode.active = true;
        }
    }
}

module.exports = ScaleController;
