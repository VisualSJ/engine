'use strict';
const Utils = require('../../../utils');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const SphereController = require('../controller/sphere-controller');
const BoxController = require('../controller/box-controller');
const CircleController = require('../controller/circle-controller');
const ConeController = require('../controller/particlesystem-cone-controller');
const HemisphereController = require('../controller/hemisphere-controller');
let Gizmo = require('../gizmo-base');
const { create3DNode } = require('../../../utils/engine');
const MathUtil = External.EditorMath;
const { vec3, quat } = cc.vmath;
let tempVec3 = cc.v3();

const ShapeType = {
    Box: 0,
    Circle: 1,
    Cone: 2,
    Sphere: 3,
    Hemisphere: 4,
};

const CurveRangeMode = {
    Constant: 0,
    Curve: 1,
    TwoCurves: 2,
    TwoConstants: 3,
};

const EmitLocation = {
    Base: 0,
    Edge: 1,
    Shell: 2,
    Volume: 3,
};

class ParticleSystemComponentGizmo extends Gizmo {
    init() {

        this._curEmitterShape = ShapeType.Box;
        this._shapeControllers = {};
        this._PSGizmoColor = new cc.Color(100, 100, 255);
        this._activeController = null;

        // common
        this._scale = cc.v3();

        // for box
        this._size = cc.v3();

        // for sphere/circle/cone
        this._radius = 0;

        // for circle
        this._arc = 0;

        // for cone
        this._coneHeight = 0;
        this._coneAngle = 0;
        this._bottomRadius = 0;

        this._isInited = true;
    }

    onShow() {
        this.updateControllerData();
    }

    onHide() {
        if (this._activeController) {
            this._activeController.hide();
        }

        let nodes = this.nodes;
        this.unregisterListeners(nodes);
    }

    createControllerByShape(shape) {
        let gizmoRoot = this.getGizmoRoot();
        let PSGizmoRoot = create3DNode('ParticleSystemGizmo');
        PSGizmoRoot.parent = gizmoRoot;
        this._pSGizmoRoot = PSGizmoRoot;
        let controller = null;

        switch (shape) {
            case ShapeType.Box:
                controller = new BoxController(PSGizmoRoot);
                break;
            case ShapeType.Sphere:
                controller = new SphereController(PSGizmoRoot);
                break;
            case ShapeType.Circle:
                controller = new CircleController(PSGizmoRoot);
                break;
            case ShapeType.Cone:
                controller = new ConeController(PSGizmoRoot);
                break;
            case ShapeType.Hemisphere:
                controller = new HemisphereController(PSGizmoRoot);
                break;
            default:
                console.error('Invalid Type:', shape);
        }

        if (controller) {
            controller.editable = true;
            controller.setColor(this._PSGizmoColor);
            controller.onControllerMouseDown = this.onControllerMouseDown.bind(this);
            controller.onControllerMouseMove = this.onControllerMouseMove.bind(this);
            controller.onControllerMouseUp = this.onControllerMouseUp.bind(this);
        }

        return controller;
    }

    getControllerByShape(shape) {
        let controller = this._shapeControllers[shape];
        if (!controller) {
            controller = this.createControllerByShape(shape);
            this._shapeControllers[shape] = controller;
        }

        return controller;
    }

    getConeData(psComp) {
        let shapeModule = psComp.shapeModule;
        let topRadius = shapeModule.radius;
        let coneAngle = shapeModule.angle;
        let height = shapeModule.length;
        let deltaRadius = 0;
        if (coneAngle < 0) {
            coneAngle = 0;
        }

        if (coneAngle >= 90) {
            deltaRadius = 1000;
        } else {
            deltaRadius = Math.tan(coneAngle * MathUtil.D2R) * height;
        }

        let bottomRadius = topRadius + deltaRadius;

        return {topRadius, height, bottomRadius, coneAngle};
    }

    modifyConeData(psComp, deltaTopRadius, deltaHeight, deltaBottomRadius) {
        let shapeModule = psComp.shapeModule;

        if (deltaTopRadius !== 0) {
            let topRadius = this._radius + deltaTopRadius;
            topRadius = MathUtil.toPrecision(topRadius, 3);
            if (topRadius < 0) {
                topRadius = 0.0001;
            }

            shapeModule.radius = topRadius;

        } else if (deltaHeight !== 0) {
            let height = this._coneHeight + deltaHeight;
            height = MathUtil.toPrecision(height, 3);
            if (height <= 0) {
                height = 0.0001;
            }

            //let startSpeed = psComp.startSpeed;
            //this.setCurveRangeInitValue(startSpeed, height);
            shapeModule.length = height;

        } else if (deltaBottomRadius !== 0) {
            let bottomRadius = this._bottomRadius + deltaBottomRadius;
            if (bottomRadius < this._radius) {
                bottomRadius = this._radius;
            }

            let coneAngle = Math.atan2(bottomRadius - this._radius, this._coneHeight) * MathUtil.R2D;
            shapeModule.angle = MathUtil.toPrecision(coneAngle, 3);
        }
    }

    setCurveRangeInitValue(curve, value) {
        switch (curve.mode) {
            case CurveRangeMode.Constant:
                curve.constant = value;
                break;
            case CurveRangeMode.Curve:
                let kf = curve.curve.keyFrames[0];
                if (kf) {
                    kf.value = value;
                }
                break;
            case CurveRangeMode.TwoCurves:
                kf = curve.curveMax.keyFrames[0];
                if (kf) {
                    kf.value = value;
                }
                break;
            case CurveRangeMode.TwoConstants:
                curve.constantMax = value;
                break;
            default:
                console.error('unknown cure range mode:', curve.mode);
        }
    }

    onControllerMouseDown() {
        if (!this._isInited || this.target == null) {
            return;
        }

        let shapeModule = this.target.shapeModule;
        this._curEmitterShape = shapeModule.shapeType;

        this._scale = NodeUtils.getWorldScale3D(this.node);

        switch (this._curEmitterShape) {
            case ShapeType.Box:
                this._size = shapeModule.scale.clone();
                break;
            case ShapeType.Sphere:
                this._radius = shapeModule.radius;
                break;
            case ShapeType.Circle:
                this._radius = shapeModule.radius;
                this._arc = shapeModule.arc;
                break;
            case ShapeType.Cone:
                let coneData = this.getConeData(this.target);
                this._radius = coneData.topRadius;
                this._coneHeight = coneData.height;
                this._coneAngle = coneData.coneAngle;
                this._bottomRadius = coneData.bottomRadius;
            case ShapeType.Hemisphere:
                this._radius = shapeModule.radius;
                break;
        }
    }

    onControllerMouseMove(/*event*/) {

        this.updateDataFromController();

        // update controller transform
        this.updateControllerData();
    }

    onControllerMouseUp() {

    }

    getScaledDeltaRadius(deltaRadius, controlDir, scale) {
        if (controlDir.x !== 0) {
            deltaRadius /= scale.x;
        } else if (controlDir.y !== 0) {
            deltaRadius /= scale.y;
        } else if (controlDir.z !== 0) {
            deltaRadius /= scale.z;
        }

        return deltaRadius;
    }

    updateDataFromController() {

        if (this._activeController.updated) {
            let node = this.node;
            let shapeModule = this.target.shapeModule;

            switch (this._curEmitterShape) {
                case ShapeType.Box:
                    let deltaSize = this._activeController.getDeltaSize();
                    vec3.div(deltaSize, deltaSize, this._scale);
                    vec3.scale(deltaSize, deltaSize, 2);
                    let newSize = vec3.add(tempVec3, this._size, deltaSize);
                    Utils.clampSize(newSize);
                    shapeModule.scale = newSize;
                    break;
                case ShapeType.Sphere:
                    var deltaRadius = this._activeController.getDeltaRadius();
                    var controlDir = this._activeController.getControlDir();

                    deltaRadius = this.getScaledDeltaRadius(deltaRadius, controlDir, this._scale);

                    var newRadius = this._radius + deltaRadius;
                    newRadius = Math.abs(newRadius);
                    newRadius = MathUtil.toPrecision(newRadius, 3);
                    shapeModule.radius = newRadius;
                    break;
                case ShapeType.Circle:
                    deltaRadius = this._activeController.getDeltaRadius();
                    controlDir = this._activeController.getControlDir();
                    if (controlDir.x !== 0) {
                        deltaRadius /= this._scale.x;
                    } else if (controlDir.y !== 0) {
                        deltaRadius /= this._scale.y;
                    }

                    newRadius = this._radius + deltaRadius;
                    newRadius = Math.abs(newRadius);
                    newRadius = MathUtil.toPrecision(newRadius, 3);
                    shapeModule.radius = newRadius;
                    break;
                case ShapeType.Cone:
                    let deltaTopRadius = this._activeController.getDeltaRadius();
                    let deltaHeight = this._activeController.getDeltaHeight();
                    let deltaBottomRadius = this._activeController.getDeltaBottomRadius();

                    this.modifyConeData(this.target, deltaTopRadius, deltaHeight, deltaBottomRadius);
                    break;
                case ShapeType.Hemisphere:
                    deltaRadius = this._activeController.getDeltaRadius();
                    controlDir = this._activeController.getControlDir();

                    deltaRadius = this.getScaledDeltaRadius(deltaRadius, controlDir, this._scale);

                    newRadius = this._radius + deltaRadius;
                    newRadius = Math.abs(newRadius);
                    newRadius = MathUtil.toPrecision(newRadius, 3);
                    shapeModule.radius = newRadius;
                    break;
            }

            // 发送节点修改消息
            Utils.broadcastMessage('scene:change-node', node);
        }
    }

    updateControllerTransform() {
        if (this.target && this.target.shapeModule) {
            let shapeModule = this.target.shapeModule;

            if (shapeModule.enable && this._pSGizmoRoot) {
                let node = this.node;
                let worldRot = cc.quat(0, 0, 0, 1);
                let worldPos = NodeUtils.getWorldPosition3D(node);

                worldRot = NodeUtils.getWorldRotation3D(node);
                let worldScale = NodeUtils.getWorldScale3D(node);

                this._pSGizmoRoot.setWorldPosition(worldPos);
                this._pSGizmoRoot.setWorldRotation(worldRot);
                this._pSGizmoRoot.setWorldScale(worldScale);

                let shapeRot = shapeModule.rotation;
                let rot = cc.quat();
                quat.fromEuler(rot, shapeRot.x, shapeRot.y, shapeRot.z);
                this._activeController.setPosition(shapeModule.position);
                this._activeController.setRotation(rot);
                this._activeController.setScale(shapeModule.scale);
            }
        }
    }

    getConeRadius(angle, height) {
        let radius = Math.tan(angle / 2 * MathUtil.D2R) * height;

        return radius;
    }

    updateControllerData() {

        if (!this._isInited || this.target == null) {
            return;
        }

        let shapeModule = this.target.shapeModule;

        if (shapeModule.enable) {
            if (this._activeController) {
                this._activeController.hide();
            }

            this._activeController = this.getControllerByShape(shapeModule.shapeType);
            this._activeController.checkEdit();
            switch (shapeModule.shapeType) {
                case ShapeType.Box:
                    break;
                case ShapeType.Sphere:
                    this._activeController.radius = shapeModule.radius;
                    break;
                case ShapeType.Circle:
                    this._activeController.updateSize(cc.v3(), shapeModule.radius, shapeModule.arc);
                    break;
                case ShapeType.Cone:
                    let coneData = this.getConeData(this.target);
                    this._activeController.updateSize(cc.v3(), coneData.topRadius, coneData.height, coneData.bottomRadius);
                    break;
                case ShapeType.Hemisphere:
                    this._activeController.radius = shapeModule.radius;
            }

            this._activeController.show();
            this.updateControllerTransform();

        } else {
            if (this._activeController) {
                this._activeController.hide();
            }
        }
    }

    onTargetUpdate() {
        this.updateControllerData();
    }

    onNodeChanged() {
        this.updateControllerData();
    }
}
module.exports = ParticleSystemComponentGizmo;
