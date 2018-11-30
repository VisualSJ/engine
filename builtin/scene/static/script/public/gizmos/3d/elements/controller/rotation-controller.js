'use strict';
const vec3 = cc.vmath.vec3;
const quat = cc.vmath.quat;
let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
let ControllerShape = require('../utils/controller-shape');
const { gfx, setNodeOpacity, getModel, updateVBAttr, create3DNode } = require('../../../utils/engine');

const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const EditorMath = External.EditorMath;

class RotationController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._deltaRotation = cc.quat(0, 0, 0, 1);
        this._rotFactor = 3;

        this.initShape();
    }

    createRotationShape(axisName, torusRot, arrowRot, arcFromDir, arcRadian, color) {
        let baseArrowHeadHeight = 25;
        let baseArrowHeadRadius = 10;
        let baseArrowBodyHeight = 140;

        let baseRadius = this._baseRadius;
        let tubeRadius = this._tubeRadius;

        let topNode = create3DNode(axisName + 'Rotation');
        topNode.parent = this.shape;

        let torusNode = ControllerUtils.torus(baseRadius, tubeRadius,
            { arc: Math.abs(arcRadian) }, color, axisName + 'RotationTorus');
        torusNode.parent = topNode;
        setNodeOpacity(torusNode, 0);
        NodeUtils.setEulerAngles(torusNode, torusRot);
        let arrowNode = ControllerUtils.arrow(baseArrowHeadHeight, baseArrowHeadRadius,
            baseArrowBodyHeight, color, axisName + 'Axis');
        arrowNode.parent = topNode;
        NodeUtils.setEulerAngles(arrowNode, arrowRot);
        let arcNode = ControllerUtils.arc(cc.v3(),
            this._axisDir[axisName], arcFromDir, arcRadian, baseRadius, color);
        arcNode.parent = topNode;
        arcNode.name = axisName + 'RotationArc';

        // indicator circle
        arcNode = ControllerUtils.arc(cc.v3(),
            this._axisDir[axisName], arcFromDir, this._twoPI, baseRadius, color);
        arcNode.parent = topNode;
        arcNode.active = false;
        arcNode.name = axisName + 'IndicatorCircle';

        this.initAxis(topNode, axisName, color);
    }

    initShape() {
        this.createShapeNode('RotationController');
        this._baseRadius = 100;
        this._tubeRadius = 3;

        // 目前碰撞检测用的是透明的Torus模型
        // x rotation
        this.createRotationShape('x', cc.v3(0, 0, 90), cc.v3(-90, -90, 0),
            this._axisDir.z, -this._halfPI, cc.Color.RED);

        // y rotation
        this.createRotationShape('y', cc.v3(0, 0, 0), cc.v3(0, 0, 0), this._axisDir.z, this._halfPI, cc.Color.GREEN);

        // z rotation
        this.createRotationShape('z', cc.v3(-90, 0, 0), cc.v3(90, 0, 90), this._axisDir.x, this._halfPI, cc.Color.BLUE);

        // for 2d z rotation, use w for hack
        this._axisDir.w = cc.v3(0, 0, 1);
        this.createRotationShape('w', cc.v3(-90, 0, 0), cc.v3(0, 0, -90), this._axisDir.x, this._twoPI, cc.Color.BLUE);

        // for rotation indicator sector
        let indicator = {};
        indicator.sectorNode = ControllerUtils.sector(cc.v3(), cc.v3(0, 1, 0), cc.v3(1, 0, 0),
            Math.PI, this._baseRadius, ControllerUtils.YELLOW);
        setNodeOpacity(indicator.sectorNode, 200);
        indicator.sectorNode.parent = this._rootNode;
        indicator.sectorNode.active = false;
        indicator.meshRenderer = getModel(indicator.sectorNode);
        this._indicator = indicator;

        this.shape.active = false;
    }

    onInitAxis(node, axisName) {
        let axisData = this._axisDataMap[axisName];
        axisData.normalTorusNode = node.getChildByName(axisName + 'RotationArc');
        axisData.indicatorCircle = node.getChildByName(axisName + 'IndicatorCircle');
        axisData.arrowNode = node.getChildByName(axisName + 'Axis');
    }

    isHitOnAxisArrow(hitNode, axisName) {
        let arrowTopNode = this._axisDataMap[axisName].arrowNode;

        for (let i = 0; i < arrowTopNode.childrenCount; i++) {
            let child = arrowTopNode._children[i];
            if (hitNode === child) {
                return true;
            }
        }

        return false;
    }

    onMouseDown(event) {
        this._mouseDownRot = quat.clone(this._rotation);
        this._mouseDeltaPos = cc.v2(0, 0);

        // 计算旋转量参考坐标轴
        let hitPoint = event.hitPoint;
        let axisDir = vec3.clone(this._axisDir[event.axisName]);
        let hitDir = cc.v3();
        let crossDir = cc.v3();
        this._indicatorStartDir = cc.v3();

        if (this._is2D) {
            if (this.isHitOnAxisArrow(event.node, event.axisName)) {
                vec3.transformQuat(hitDir, cc.v3(1, 0, 0), this._rotation);
            } else {
                vec3.sub(hitDir, hitPoint, this._position);
            }

            // 2D情况下rotation扇形指示器从自身x轴为起始方向
            vec3.transformQuat(this._indicatorStartDir, cc.v3(1, 0, 0), this._rotation);
        } else {
            vec3.sub(hitDir, hitPoint, this._position);
            this._indicatorStartDir = hitDir;
        }

        vec3.normalize(hitDir, hitDir);
        vec3.transformQuat(axisDir, axisDir, this._rotation);
        vec3.cross(crossDir, hitDir, axisDir);
        vec3.cross(hitDir, axisDir, crossDir);

        this._rotateAlignDir = crossDir;
        this._transformAxisDir = axisDir;
        vec3.add(this._rotateAlignDir, this._rotateAlignDir, this._position);

        // show indicator
        this.updateRotationIndicator(this._transformAxisDir, this._indicatorStartDir, 0);
        this._indicator.sectorNode.active = true;
        this._axisDataMap[event.axisName].indicatorCircle.active = true;

        Object.keys(this._axisDataMap).forEach((key) => {
            if (key === event.axisName) {
                this._axisDataMap[key].normalTorusNode.active = false;
            } else {
                this._axisDataMap[key].topNode.active = false;
            }
        });

        // 锁定鼠标
        cc.game.canvas.requestPointerLock();

        // debug
        // let debugDir = cc.v3();
        // vec3.scale(debugDir, hitDir, 1000);
        // let worldPos = this.localToWorldPosition(cc.v3());
        // vec3.add(debugDir, debugDir, worldPos);
        // this._dirNode = ControllerUtils.lineTo(worldPos, debugDir);
        // this._dirNode.parent = this._rootNode;

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        // mousemovent sometimes has a big number when pointer was locked
        // https://stackoverflow.com/questions/47985847/javascript-mouseevent-movementx-and-movementy-large-spikes
        let deltaX = EditorMath.clamp(event.moveDeltaX, -10, 10);
        let deltaY = EditorMath.clamp(event.moveDeltaY, -10, 10);

        this._mouseDeltaPos.x += deltaX;
        this._mouseDeltaPos.y += deltaY;

        quat.identity(this._deltaRotation);

        let radian;
        if (event.axisName.length === 1) {
            let alignAxisMoveDist = this.getAlignAxisMoveDistance(this._rotateAlignDir, this._mouseDeltaPos);

            radian = -alignAxisMoveDist / this._rotFactor * this._degreeToRadianFactor;
            quat.fromAxisAngle(this._deltaRotation, this._axisDir[event.axisName], radian);
        }

        this.updateRotationIndicator(this._transformAxisDir, this._indicatorStartDir, radian);
        quat.mul(this._rotation, this._mouseDownRot, this._deltaRotation);

        if (this.onControllerMouseMove != null) {
            this.onControllerMouseMove(event);
        }

        this.updateController();
    }

    onMouseUp() {
        // if (this._dirNode)
        //     this._dirNode.destroy();

        document.exitPointerLock();
        this._indicator.sectorNode.active = false;
        this._deltaRotation = cc.quat(0, 0, 0, 1);

        if (this._is2D) {
            this._axisDataMap.w.indicatorCircle.active = false;
            this._axisDataMap.w.normalTorusNode.active = true;
            this._axisDataMap.w.topNode.active = true;
        } else {
            Object.keys(this._axisDataMap).forEach((key) => {
                if (key !== 'w') {
                    this._axisDataMap[key].normalTorusNode.active = true;
                    this._axisDataMap[key].topNode.active = true;
                    this._axisDataMap[key].indicatorCircle.active = false;
                }
            });
        }

        if (this.onControllerMouseUp != null) {
            this.onControllerMouseUp();
        }
    }

    onMouseLeave() {
        this.onMouseUp();
    }

    onHoverIn(event) {
        this.setAxisColor(event.axisName, ControllerUtils.YELLOW);

        Object.keys(this._axisDataMap).forEach((key) => {
            if (key !== event.axisName) {
                this.setNodesOpacity(this._axisDataMap[key].rendererNodes, 50);
            }
        });
    }

    onHoverOut(/*event*/) {
        this.resetAxisColor();

        Object.keys(this._axisDataMap).forEach((key) => {
            this.setNodesOpacity(this._axisDataMap[key].rendererNodes, 255);
        });
    }

    setNodesOpacity(nodes, opacity) {
        nodes.forEach((node) => {
            setNodeOpacity(node, opacity);
        });
    }

    getDeltaRotation() {
        return this._deltaRotation;
    }

    onShow() {
        if (this._is2D) {
            this._axisDataMap.x.topNode.active = false;
            this._axisDataMap.y.topNode.active = false;
            this._axisDataMap.z.topNode.active = false;

            this._axisDataMap.w.topNode.active = true;
            this.updateController();
        } else {
            this._axisDataMap.x.topNode.active = true;
            this._axisDataMap.y.topNode.active = true;
            this._axisDataMap.z.topNode.active = true;

            this._axisDataMap.w.topNode.active = false;
        }
    }

    updateRotationIndicator(normal, fromDir, radian) {
        let positions = ControllerShape.CalcSectorPoints(
            this._position, normal, fromDir, radian,
            this._baseRadius * this.getDistScalar(), 60);

        updateVBAttr(this._indicator.meshRenderer.mesh, gfx.ATTR_POSITION, positions);
    }
}

module.exports = RotationController;
