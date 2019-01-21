'use strict';

let EditableController = require('./editable-controller');
let ControllerShape = require('../utils/controller-shape');
let ControllerUtils = require('../utils/controller-utils');
const { AttributeName, setNodeOpacity, getModel, updateVBAttr, setMeshColor } = require('../../../utils/engine');
const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const EditorCamera = External.EditorCamera;
const MathUtil = External.EditorMath;

const vec3 = cc.vmath.vec3;
const quat = cc.vmath.quat;
let tempVec3 = cc.v3();

class SphereController extends EditableController {
    constructor(rootNode) {
        super(rootNode);

        this._color = cc.Color.WHITE;
        this._center = cc.v3();
        this._radius = 100;

        this._axisDir.neg_x = cc.v3(-1, 0, 0);
        this._axisDir.neg_y = cc.v3(0, -1, 0);
        this._axisDir.neg_z = cc.v3(0, 0, -1);
        this._deltaRadius = 0;

        this.initShape();
    }

    get radius() { return this._radius; }
    set radius(value) {
        this.updateSize(this._center, value);
    }

    setColor(color) {
        Object.keys(this._circleDataMap).forEach((key) => {
            let curData = this._circleDataMap[key];
            setMeshColor(curData.frontArcMR.node, color);
            setMeshColor(curData.backArcMR.node, color);
        });

        setMeshColor(this._borderCircle, color);
        this.setEditCtrlColor(color);

        this._color = color;
    }

    createCircleByAxis(axisName, fromAxisName, color) {
        let normalDir = this._axisDir[axisName];
        let fromDir = this._axisDir[fromAxisName];
        let frontArcNode = ControllerUtils.arc(this._center, normalDir, fromDir,
            Math.PI * 2, this._radius, color);
        frontArcNode.parent = this.shape;

        let backArcNode = ControllerUtils.arc(this._center, normalDir, fromDir,
            Math.PI * 2, this._radius, color);
        backArcNode.parent = this.shape;
        setNodeOpacity(backArcNode, 70);

        let axisData = {};
        axisData.frontArcMR = getModel(frontArcNode);
        axisData.backArcMR = getModel(backArcNode);
        axisData.normalDir = normalDir;
        axisData.fromDir = fromDir;
        this._circleDataMap[axisName] = axisData;
    }

    createBorderCircle() {
        this._borderCircle = ControllerUtils.circle(
            this._center, cc.v3(0, 0, 1), this._radius, this._color);
        this._borderCircle.name = 'borderCircle';
        this._borderCircle.parent = this.shape;
        this._borderCircelMR = getModel(this._borderCircle);
    }

    _updateEditController(axisName) {
        let node = this._axisDataMap[axisName].topNode;
        let dir = this._axisDir[axisName];

        let offset = cc.v3();
        vec3.scale(offset, dir, this._radius);
        let pos = offset.add(this._center);
        node.setPosition(pos.x, pos.y, pos.z);
    }

    initShape() {
        this.createShapeNode('SphereController');

        this._circleDataMap = {};

        this.createCircleByAxis('x', 'z', this._color);
        this.createCircleByAxis('y', 'x', this._color);
        this.createCircleByAxis('z', 'x', this._color);

        this.createBorderCircle();
        this.hide();

        EditorCamera._camera.node.on('transform-changed', this.onEditorCameraMoved, this);
    }

    updateSize(center, radius) {
        this._center = center;
        this._radius = radius;

        if (this._edit) {
            this.updateEditControllers();
        }

        this.updateShape();
    }

    // don't scale when camera move
    getDistScalar() {
        return 1;
    }

    updateShape() {
        let cameraNode = EditorCamera._camera.node;
        let cameraPos = NodeUtils.getWorldPosition3D(cameraNode);
        let mat = cc.vmath.mat4.create();
        this.shape.getWorldMatrix(mat);
        cc.vmath.mat4.invert(mat, mat);
        vec3.transformMat4(cameraPos, cameraPos, mat);  // convert camera pos to controller local space
        let cameraToCenterDir = cc.v3();

        vec3.sub(cameraToCenterDir, this._center, cameraPos);

        let sqrDist = Utils.getSqrMagnitude(cameraToCenterDir);
        let sqrRadius = this._radius * this._radius;
        let sqrOffset = sqrRadius * sqrRadius / sqrDist;
        let offsetPercent = sqrOffset / sqrRadius;
        // draw border circle
        // if outside of sphere
        if (offsetPercent < 1) {
            this._borderCircle.active = true;
            let borderCicleRadius = Math.sqrt(sqrRadius - sqrOffset);

            let offsetVec = vec3.scale(tempVec3, cameraToCenterDir, sqrRadius / sqrDist);
            let borderCicleCenter = vec3.sub(tempVec3, this._center, offsetVec);
            let circlePoints = ControllerShape.calcCirclePoints(
                borderCicleCenter, cameraToCenterDir, borderCicleRadius);
            updateVBAttr(this._borderCircelMR.mesh, AttributeName.POSITION, circlePoints);
        } else {
            this._borderCircle.active = false;
        }

        //draw axis-aligned circles
        Object.keys(this._circleDataMap).forEach((key) => {
            let normalDir = this._circleDataMap[key].normalDir;
            let frontArcMR = this._circleDataMap[key].frontArcMR;
            let backArcMR = this._circleDataMap[key].backArcMR;
            if (offsetPercent < 1) {
                let q = ControllerUtils.angle(cameraToCenterDir, normalDir);
                q = 90 - Math.min(q, 180 - q);
                let f = Math.tan(q * MathUtil.D2R);
                let g = Math.sqrt(sqrOffset + f * f * sqrOffset) / this._radius;
                if (g < 1) {
                    let e = Math.asin(g);
                    let from = vec3.cross(tempVec3, normalDir, cameraToCenterDir).normalize();
                    let rot = cc.quat(0, 0, 0, 1);
                    quat.fromAxisAngle(rot, normalDir, e);
                    vec3.transformQuat(from, from, rot);
                    this.updateArcMesh(frontArcMR.mesh, this._center,
                        normalDir, from, (MathUtil.HALF_PI - e) * 2, this._radius);

                    frontArcMR.node.active = true;
                    this.updateArcMesh(backArcMR.mesh, this._center,
                        normalDir, from, (MathUtil.HALF_PI - e) * 2 - MathUtil.TWO_PI, this._radius);
                } else {
                    this.updateArcMesh(backArcMR.mesh, this._center,
                        normalDir, this._circleDataMap[key].fromDir, MathUtil.TWO_PI, this._radius);
                    frontArcMR.node.active = false;
                }
            } else {
                this.updateArcMesh(backArcMR.mesh, this._center,
                    normalDir, this._circleDataMap[key].fromDir, MathUtil.TWO_PI, this._radius);
                frontArcMR.node.active = false;
            }
        });

        this.adjustEditControllerSize();
    }

    updateArcMesh(mesh, center, normal, from, radian, radius) {
        let arcPositions = ControllerShape.calcArcPoints(
            center, normal, from, radian, radius
        );

        updateVBAttr(mesh, AttributeName.POSITION, arcPositions);
    }

    onEditorCameraMoved() {
        this.updateShape();
    }

    // mouse events
    onMouseDown(event) {
        this._mouseDeltaPos = cc.v2(0, 0);
        this._curDistScalar = super.getDistScalar();

        if (this.onControllerMouseDown != null) {
            this.onControllerMouseDown();
        }
    }

    onMouseMove(event) {
        this._mouseDeltaPos.x += event.moveDeltaX;
        this._mouseDeltaPos.y += event.moveDeltaY;

        let axisDir = this._axisDir[event.axisName];
        this._deltaRadius = this.getAlignAxisMoveDistance(this.localToWorldDir(axisDir),
            this._mouseDeltaPos) * this._curDistScalar;

        if (this.onControllerMouseMove != null) {
            this.onControllerMouseMove(event);
        }
    }

    onMouseUp(event) {

        if (this.onControllerMouseUp != null) {
            this.onControllerMouseUp();
        }
    }

    onMouseLeave() {
        this.onMouseUp();
    }
    // mouse events end

    getDeltaRadius() {
        return this._deltaRadius;
    }
}

module.exports = SphereController;
