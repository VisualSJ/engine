'use strict';
const vec3 = cc.vmath.vec3;
const quat = cc.vmath.quat;
let ControllerBase = require('./controller-base');
let ControllerUtils = require('../utils/controller-utils');
let ControllerShape = require('../utils/controller-shape');
const { AttributeName, setNodeOpacity, getModel, updateVBAttr, create3DNode, panPlaneLayer,
    getRaycastResults, setMeshColor } = require('../../../utils/engine');
const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const MathUtil = External.EditorMath;
const EditorCamera = External.EditorCamera;

let tempQuat = cc.quat();

class RotationController extends ControllerBase {
    constructor(rootNode) {
        super(rootNode);

        this._deltaRotation = cc.quat(0, 0, 0, 1);
        this._rotFactor = 3;

        // for 2d rotation
        this._zDeltaAngle = 0;

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
            { arc: Math.abs(arcRadian) }, color);
        torusNode.name = axisName + 'RotationTorus';
        torusNode.parent = topNode;
        setNodeOpacity(torusNode, 0);
        NodeUtils.setEulerAngles(torusNode, torusRot);
        let arrowNode = ControllerUtils.arrow(baseArrowHeadHeight, baseArrowHeadRadius,
            baseArrowBodyHeight, color);
        arrowNode.name = axisName + 'Axis';
        arrowNode.parent = topNode;
        NodeUtils.setEulerAngles(arrowNode, arrowRot);
        let arcNode = ControllerUtils.arc(cc.v3(),
            this._axisDir[axisName], arcFromDir, arcRadian, baseRadius, color, { noDepthTestForLines: true });
        arcNode.parent = topNode;
        arcNode.name = axisName + 'RotationArc';

        // indicator circle
        arcNode = ControllerUtils.arc(cc.v3(), this._axisDir[axisName], arcFromDir,
            this._twoPI, baseRadius, color, { noDepthTestForLines: true });
        arcNode.parent = topNode;
        arcNode.active = false;
        arcNode.name = axisName + 'IndicatorCircle';

        this.initAxis(topNode, axisName);
    }

    initShape() {
        this.createShapeNode('RotationController');
        this.registerSizeChangeEvents();

        this._baseRadius = 100;
        this._tubeRadius = 3;

        // 目前碰撞检测用的是透明的Torus模型
        // x rotation
        this.createRotationShape('x', cc.v3(0, 0, 90), cc.v3(-90, -90, 0),
            this._axisDir.z, -this._twoPI, cc.Color.RED);

        // y rotation
        this.createRotationShape('y', cc.v3(0, 0, 0), cc.v3(0, 0, 0), this._axisDir.z, this._twoPI, cc.Color.GREEN);

        // z rotation
        this.createRotationShape('z', cc.v3(-90, 0, 0), cc.v3(90, 0, 90), this._axisDir.x, this._twoPI, cc.Color.BLUE);

        // for 2d z rotation, use w for hack
        this._axisDir.w = cc.v3(0, 0, 1);
        this.createRotationShape('w', cc.v3(-90, 0, 0), cc.v3(0, 0, -90), this._axisDir.x, this._twoPI, cc.Color.BLUE);

        // circle border
        let cameraNode = EditorCamera._camera.node;
        let cameraRot = cameraNode.getWorldRotation(tempQuat);
        let cameraNormal = cc.v3();
        vec3.transformQuat(cameraNormal, cc.v3(0, 0, 1), cameraRot);
        let circleBorderNode = ControllerUtils.circle(cc.v3(), cameraNormal,
            this._baseRadius, new cc.Color(20, 20, 20));
        circleBorderNode.name = 'circleBorder';
        circleBorderNode.parent = this._rootNode;
        setNodeOpacity(circleBorderNode, 200);

        this._circleBorderNode = circleBorderNode;
        this._circleBorderMR = getModel(circleBorderNode);
        this._circleBorderNode.setWorldPosition(this._position);

        // for cut off
        // let cutoffNode = ControllerUtils.disc(cc.v3(), cameraNormal,
        //     this._baseRadius, ControllerUtils.RED);
        // 圆盘暂时无法碰撞检测，先用quad代替
        let cutoffNode = ControllerUtils.quad(this._baseRadius * 2 , this._baseRadius * 2);
        setNodeOpacity(cutoffNode, 0);
        cutoffNode.parent = this._rootNode;
        cutoffNode.layer = panPlaneLayer;
        this._cutoffNode = cutoffNode;
        this._cutoffMR = getModel(cutoffNode);

        // for rotation indicator sector
        let indicator = {};
        indicator.sectorNode = ControllerUtils.sector(cc.v3(), cc.v3(0, 1, 0), cc.v3(1, 0, 0),
            Math.PI, this._baseRadius, ControllerUtils.YELLOW, {unlit:true});
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
        axisData.arrowNode.active = false;
        axisData.normalTorusMR = getModel(axisData.normalTorusNode);
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

    isInCutoffBack(axisName, x, y) {
        let hitAxisNode = this._axisDataMap[axisName].normalTorusNode;
        let results = getRaycastResults(this._cutoffNode, x, y);

        if (results.length > 0) {
            let cutOffDist = results[0].distance;

            results = getRaycastResults(hitAxisNode, x, y);
            if (results.length > 0) {
                let axisDist = results[0].distance;
                if (axisDist > cutOffDist) {
                    return true;
                }
            }
        }

        return false;
    }

    onMouseDown(event) {
        if (!this.is2D && this.isInCutoffBack(event.axisName, event.x, event.y)) {
            return;
        }

        this._mouseDownRot = quat.clone(this._rotation);
        this._mouseDeltaPos = cc.v2(0, 0);

        // 计算旋转量参考坐标轴
        let hitPoint = event.hitPoint;
        let axisDir = vec3.clone(this._axisDir[event.axisName]);
        let hitDir = cc.v3();
        let crossDir = cc.v3();
        this._indicatorStartDir = cc.v3();

        if (this.is2D) {
            if (this.isHitOnAxisArrow(event.node, event.axisName)) {
                vec3.transformQuat(hitDir, cc.v3(1, 0, 0), this._rotation);
            } else {
                vec3.sub(hitDir, hitPoint, this._position);
            }

            // 2D情况下rotation扇形指示器从自身x轴为起始方向
            vec3.transformQuat(this._indicatorStartDir, cc.v3(1, 0, 0), this._rotation);
            this._zDeltaAngle = 0;
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
        //vec3.add(this._rotateAlignDir, this._rotateAlignDir, this._position);

        // show indicator
        this.updateRotationIndicator(this._transformAxisDir, this._indicatorStartDir, 0);
        this._indicator.sectorNode.active = true;
        this._axisDataMap[event.axisName].indicatorCircle.active = true;

        // hide border
        this._circleBorderNode.active = false;

        Object.keys(this._axisDataMap).forEach((key) => {
            if (key === event.axisName) {
                this._axisDataMap[key].normalTorusNode.active = false;
                this._axisDataMap[key].arrowNode.active = true;
            } else {
                this._axisDataMap[key].topNode.active = false;
            }
        });

        // 锁定鼠标
        Utils.requestPointerLock();

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        // mousemovent sometimes has a big number when pointer was locked
        // https://stackoverflow.com/questions/47985847/javascript-mouseevent-movementx-and-movementy-large-spikes
        let deltaX = MathUtil.clamp(event.moveDeltaX, -10, 10);
        let deltaY = MathUtil.clamp(event.moveDeltaY, -10, 10);

        this._mouseDeltaPos.x += deltaX;
        this._mouseDeltaPos.y += deltaY;

        quat.identity(this._deltaRotation);

        let radian;
        if (event.axisName.length === 1) {
            let alignAxisMoveDist = this.getAlignAxisMoveDistance(this._rotateAlignDir, this._mouseDeltaPos);

            radian = -alignAxisMoveDist / this._rotFactor * this._degreeToRadianFactor;
            quat.fromAxisAngle(this._deltaRotation, this._axisDir[event.axisName], radian);

            if (this.is2D) {
                this._zDeltaAngle = -alignAxisMoveDist / this._rotFactor;
            }
        }

        this.updateRotationIndicator(this._transformAxisDir, this._indicatorStartDir, radian);
        quat.mul(this._rotation, this._mouseDownRot, this._deltaRotation);

        if (this.onControllerMouseMove != null) {
            this.onControllerMouseMove(event);
        }

        this.updateController();
    }

    onMouseUp() {
        Utils.exitPointerLock();
        this._indicator.sectorNode.active = false;
        this._deltaRotation = cc.quat(0, 0, 0, 1);
        // show border
        this._circleBorderNode.active = true;

        if (this.is2D) {
            this._axisDataMap.w.indicatorCircle.active = false;
            this._axisDataMap.w.normalTorusNode.active = true;
            this._axisDataMap.w.topNode.active = true;
        } else {
            Object.keys(this._axisDataMap).forEach((key) => {
                if (key !== 'w') {
                    this._axisDataMap[key].normalTorusNode.active = true;
                    this._axisDataMap[key].topNode.active = true;
                    this._axisDataMap[key].indicatorCircle.active = false;
                    this._axisDataMap[key].arrowNode.active = false;
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
        if (!this.is2D && this.isInCutoffBack(event.axisName, event.x, event.y)) {
            return;
        }

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

    getZDeltaAngle() {
        return this._zDeltaAngle;
    }

    onShow() {
        if (this.is2D) {
            this._axisDataMap.x.topNode.active = false;
            this._axisDataMap.y.topNode.active = false;
            this._axisDataMap.z.topNode.active = false;

            this._axisDataMap.w.topNode.active = true;
            this._axisDataMap.w.arrowNode.active = true;
            this._circleBorderNode.active = false;
            this._cutoffNode.active = false;
            this.updateController();
        } else {
            this._axisDataMap.x.topNode.active = true;
            this._axisDataMap.y.topNode.active = true;
            this._axisDataMap.z.topNode.active = true;

            this._axisDataMap.w.topNode.active = false;
            this._axisDataMap.w.arrowNode.active = false;
            this._circleBorderNode.active = true;
            this._cutoffNode.active = true;
        }
    }

    onHide() {
        this._circleBorderNode.active = false;
        this._cutoffNode.active = false;
    }

    updateRotationIndicator(normal, fromDir, radian) {
        let positions = ControllerShape.calcSectorPoints(
            this._position, normal, fromDir, radian,
            this._baseRadius * this.getDistScalar(), 60);

        updateVBAttr(this._indicator.meshRenderer.mesh, AttributeName.POSITION, positions);
    }

    adjustControllerSize() {
        let scalar = this.getDistScalar();
        let newScale = this._scale.mul(scalar);
        this.shape.setScale(newScale);

        // update circle border
        this._circleBorderNode.setScale(newScale);
        this._circleBorderNode.setWorldPosition(this._position);
        let cameraNode = EditorCamera._camera.node;
        let cameraRot = cameraNode.getWorldRotation(tempQuat);
        let cameraNormal = cc.v3();
        vec3.transformQuat(cameraNormal, cc.v3(0, 0, 1), cameraRot);
        let positions = ControllerShape.calcCirclePoints(cc.v3(), cameraNormal,
            this._baseRadius);
        updateVBAttr(this._circleBorderMR.mesh, AttributeName.POSITION, positions);

        // update cutoff
        //positions = ControllerShape.calcDiscPoints(cc.v3(), cameraNormal, this._baseRadius);
        //updateVBAttr(this._cutoffMR.mesh, AttributeName.POSITION, positions);
        this._cutoffNode.setScale(newScale);
        this._cutoffNode.setWorldPosition(this._position);
        this._cutoffNode.setWorldRotation(cameraRot);

        let localCamNormal = cc.v3();
        let worldToLocalMat = cc.mat4();
        this.shape.getWorldMatrix(worldToLocalMat);
        cc.vmath.mat4.invert(worldToLocalMat, worldToLocalMat);
        vec3.transformMat4Normal(localCamNormal, cameraNormal, worldToLocalMat);

        if (!this.is2D) {
            Object.keys(this._axisDataMap).forEach((key) => {
                if (key !== 'w') {
                    let from = cc.v3();
                    let axisDir = this._axisDir[key];
                    vec3.cross(from, axisDir, localCamNormal);
                    vec3.normalize(from, from);
                    positions = ControllerShape.calcArcPoints(cc.v3(), axisDir, from, -Math.PI,
            this._baseRadius);

                    let axisData = this._axisDataMap[key];
                    updateVBAttr(axisData.normalTorusMR.mesh, AttributeName.POSITION, positions);
                }
            });
        }
    }
}

module.exports = RotationController;
