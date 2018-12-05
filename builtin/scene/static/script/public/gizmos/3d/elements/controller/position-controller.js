'use strict';
const vec3 = cc.vmath.vec3;
let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const { getRaycastResults, setNodeOpacity, panPlaneLayer } = require('../../../utils/engine');

class PositionController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._deltaPosition = cc.v3(0, 0, 0);
        this._mouseDownPos = cc.v3(0, 0, 0);

        // delegate function
        this.onControllerMouseDown = null;
        this.onControllerMouseMove = null;
        this.onControllerMouseUp = null;

        this.initShape();
    }

    createAxis(axisName, color, rotation) {
        let baseArrowHeadHeight = 25;
        let baseArrowHeadRadius = 10;
        let baseArrowBodyHeight = 140;

        let axisNode = ControllerUtils.arrow(baseArrowHeadHeight, baseArrowHeadRadius,
            baseArrowBodyHeight, color, axisName + 'Axis');
        axisNode.parent = this.shape;
        NodeUtils.setEulerAngles(axisNode, rotation);
        this.initAxis(axisNode, axisName, color);
    }

    createControlPlane(axisName, color, rotation) {
        let planeWidth = 25;
        let halfPlaneWidth = planeWidth / 2;

        let pos = cc.v3();
        for (let i = 0; i < axisName.length; i++) {
            let deltaPos = cc.v3();
            vec3.scale(deltaPos, this._axisDir[axisName.charAt(i)], halfPlaneWidth);
            pos = pos.add(deltaPos);
        }

        let borderPlane = ControllerUtils.borderPlane(planeWidth, planeWidth, color, axisName + 'Plane');
        borderPlane.parent = this.shape;
        NodeUtils.setEulerAngles(borderPlane, rotation);
        borderPlane.setPosition(pos.x, pos.y, pos.z);
        let panPlane = ControllerUtils.plane(100000, 100000);
        panPlane.parent = borderPlane;
        panPlane.name = axisName + 'PanPlane';
        panPlane.active = false;
        panPlane._layer = panPlaneLayer;
        setNodeOpacity(panPlane, 0);
        this.initAxis(borderPlane, axisName, color);
    }

    initShape() {
        this.createShapeNode('PositionController');
        this.registerSizeChangeEvents();

        // x axis
        this.createAxis('x', cc.Color.RED, cc.v3(-90, -90, 0));

        // y axis
        this.createAxis('y', cc.Color.GREEN, cc.v3());

        // z axis
        this.createAxis('z', cc.Color.BLUE, cc.v3(90, 0, 90));

        // control plane
        // x-y plane
        this.createControlPlane('xy', cc.Color.BLUE, cc.v3(90, 0, 90));

        // x-z plane
        this.createControlPlane('xz', cc.Color.GREEN, cc.v3());

        // y-z plane
        this.createControlPlane('yz', cc.Color.RED, cc.v3(-90, -90, 0));

        this.hide();
    }

    onInitAxis(node, axisName) {
        if (axisName.length > 1) {
            let axisData = this._axisDataMap[axisName];
            axisData.panPlane = node.getChildByName(axisName + 'PanPlane');
        }
    }

    getDeltaPosition() {
        return this._deltaPosition;
    }

    onMouseDown(event) {
        this._deltaPosition = cc.v3(0, 0, 0);
        this._mouseDownPos = this._position;
        this._mouseDeltaPos = cc.v2(0, 0);
        this._mouseDownAxis = event.axisName;
        this._curDistScalar = this.getDistScalar();

        if (this._mouseDownAxis.length > 1) {
            this._isInPanDrag = true;
            this._dragPanPlane = this._axisDataMap[this._mouseDownAxis].panPlane;
            this._dragPanPlane.active = true;
            this._mouseDownOnPlanePos = cc.v3();
            this.getPositionOnPanPlane(this._mouseDownOnPlanePos, event.x, event.y, this._dragPanPlane);
        }

        // 因为svg在最上层，后面改用cc.game.canvas
        cc.game.canvas.style.cursor = 'move';

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    getAlignAxisDeltaPosition(axisName, curMouseDeltaPos) {
        let axisDir = this._axisDir[axisName];
        let alignAxisMoveDist = this.getAlignAxisMoveDistance(this.localToWorldPosition(axisDir), curMouseDeltaPos);
        let deltaPosition = cc.v3();
        vec3.scale(deltaPosition, axisDir, alignAxisMoveDist * this._curDistScalar);

        return deltaPosition;
    }

    getPositionOnPanPlane(hitPos, x, y, panPlane) {
        let results = getRaycastResults(panPlane, x, y);
        let ray = results.ray;

        if (results.length > 0) {
            let firstResult = results[0];
            vec3.scale(hitPos, ray.d, firstResult.distance);
            vec3.add(hitPos, ray.o, hitPos);

            return true;
        }

        return false;
    }

    onMouseMove(event) {
        if (this._isInPanDrag) {
            let hitPos = cc.v3();
            if (this.getPositionOnPanPlane(hitPos, event.x, event.y, this._dragPanPlane)) {
                this._deltaPosition = hitPos.sub(this._mouseDownOnPlanePos);
            }
        } else {
            this._mouseDeltaPos.x += event.moveDeltaX;
            this._mouseDeltaPos.y += event.moveDeltaY;

            vec3.set(this._deltaPosition, 0, 0, 0);

            for (let i = 0; i < event.axisName.length; i++) {
                let tempDeltaPosition = this.getAlignAxisDeltaPosition(event.axisName.charAt(i), this._mouseDeltaPos);

                vec3.add(this._deltaPosition, this._deltaPosition, tempDeltaPosition);
            }

            vec3.transformQuat(this._deltaPosition, this._deltaPosition, this._rotation);
        }

        this._position = this._mouseDownPos.add(this._deltaPosition);

        if (this.onControllerMouseMove != null) {
            this.onControllerMouseMove(event);
        }

        this.updateController();
    }

    onMouseUp() {
        if (this._isInPanDrag) {
            this._dragPanPlane.active = false;
            this._isInPanDrag = false;
        }

        cc.game.canvas.style.cursor = 'default';
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

    onShow() {
        if (this.is2D) {
            this._axisDataMap.z.topNode.active = false;
            this._axisDataMap.xz.topNode.active = false;
            this._axisDataMap.yz.topNode.active = false;
            this.updateController();
        } else {
            this._axisDataMap.z.topNode.active = true;
            this._axisDataMap.xz.topNode.active = true;
            this._axisDataMap.yz.topNode.active = true;
        }
    }
}

module.exports = PositionController;
