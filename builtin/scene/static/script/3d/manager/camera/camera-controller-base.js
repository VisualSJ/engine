'use strict';

const { EventEmitter } = require('events');
const { vec3, quat } = cc.vmath;

const nodeUtils = require('../../../utils/node');

const operationManager = require('../operation');
const nodeManager = require('../node');

const utils = require('./utils');
const tween = require('./tween');

const CameraMoveMode = utils.CameraMoveMode;

class CameraControllerBase extends EventEmitter {

    constructor() {
        super();

        this.v3a = cc.v3(); // moving
        this.v3b = cc.v3(); // moving
        this.v3c = cc.v3(); // tweening
        this.v3d = cc.v3(); // tweening

        // speed controller
        this.movingSpeed = 30;
        this.movingSpeedShiftScale = 3;
        this.rotationSpeed = 0.006;
        this.panningSpeed = 0.2;
        this.wheelSpeed = 0.1;
        this.damping = 20.0;

        this.homePos = cc.v3(50, 50, 50);
        this.homeRot = quat.fromViewUp(cc.quat(), vec3.normalize(this.v3a, this.homePos));
        this._sceneViewCenter = cc.v3();
        this.defaultViewDist = 20;    // default sceneViewCenter to Camera distance;
        this.viewDist = 20;

        // temps to store directions
        this.id_right = cc.v3(1, 0, 0);
        this.id_up = cc.v3(0, 1, 0);
        this.id_forward = cc.v3(0, 0, 1);
        this.right = cc.v3(this.id_right);
        this.up = cc.v3(this.id_up);
        this.forward = cc.v3(this.id_forward);

        // temps to store velocity
        this.velocity = cc.v3();
        this.curMovSpeed = this.movingSpeed;
        this.curMouseDX = 0;
        this.curMouseDY = 0;

        // temps to store transform
        this._curRot = quat.create();
        this._curEye = cc.v3();
        this._destRot = quat.create();
        this._destEye = cc.v3();
    }

    init(camera) {
        this._camera = camera;
        this.node = this._camera.node;
        this.camera_move_mode = CameraMoveMode.NONE;

        this.reset();
    }

    /**
     * 还原数据
     */
    reset() {
        this.node.getWorldRotation(this._curRot);
        this._destRot = quat.clone(this._curRot);
        this.node.getWorldPosition(this._curEye);
        this._destEye = vec3.clone(this._curEye);
    }



    /**
     * 根据传入的视线长度来更新当前场景视图的中心点
     * @param {*} viewDist
     */
    updateViewCenterByDist(viewDist) {
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.forward, this.id_forward, this._curRot);
        vec3.scale(this.v3a, this.forward, viewDist);
        vec3.add(this.v3b, this._curEye, this.v3a);
        this._sceneViewCenter = this.v3b;
    }

    /**
     * 进入 Orbit 操作模式
     */
    enterOrbitMode() {
        this.camera_move_mode = CameraMoveMode.ORBIT;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        this.viewDist = vec3.distance(this._curEye, this._sceneViewCenter);
    }

    /**
     * 退出 Orbit 操作模式
     */
    exitOrbitMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 进入 Pan 操作模式
     */
    enterPanMode() {
        this.camera_move_mode = CameraMoveMode.PAN;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.right, this.id_right, this._curRot);
        vec3.transformQuat(this.up, this.id_up, this._curRot);
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 退出 Pan 操作模式
     */
    exitPanMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);

        this.updateViewCenterByDist(-this.viewDist);
    }

    /**
     * 进入 Wander 操作模式
     */
    enterWanderMode() {
        this.reset();
        this.camera_move_mode = CameraMoveMode.WANDER;
        utils.$info.hidden = false;
        this.curMouseDX = 0;
        this.curMouseDY = 0;
        operationManager.requestPointerLock();
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 退出 Wander 操作模式
     */
    exitWanderMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
        operationManager.exitPointerLock();
        utils.$info.hidden = true;

        this.updateViewCenterByDist(-this.viewDist);
    }

    /**
     * 移动画笔
     * 不同模式下响应方式不同
     * @param {*} dx
     * @param {*} dy
     */
    move(dx, dy) {
        if (this.camera_move_mode === CameraMoveMode.ORBIT) {
            let rot = this._curRot;
            quat.rotateX(rot, rot, -dy * this.rotationSpeed);
            quat.rotateAround(rot, rot, cc.v3(0, 1, 0), -dx * this.rotationSpeed);
            let offset = cc.v3(0, 0, this.viewDist);
            vec3.transformQuat(offset, offset, rot);
            vec3.add(this._curEye, this._sceneViewCenter, offset);
            this.node.setWorldPosition(this._curEye);
            this.node.setRotation(rot);
        } else if (this.camera_move_mode === CameraMoveMode.PAN) { // middle button: panning
            vec3.scale(this.v3a, this.right, -dx * this.panningSpeed);
            vec3.scale(this.v3b, this.up, dy * this.panningSpeed);
            vec3.add(this._curEye, this._curEye, this.v3a);
            vec3.add(this._curEye, this._curEye, this.v3b);
            this.node.setWorldPosition(this._curEye);

            // update view center
            vec3.add(this._sceneViewCenter, this._sceneViewCenter, this.v3a);
            vec3.add(this._sceneViewCenter, this._sceneViewCenter, this.v3b);
            return false;
        } else if (this.camera_move_mode === CameraMoveMode.WANDER) { // right button: rotation
            this.curMouseDX = dx;
            this.curMouseDY = dy;
            return false;
        }
    }

    /**
     * 缩放
     * @param {*} delta
     */
    scale(delta) {
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.forward, this.id_forward, this._curRot);
        vec3.scale(this.v3a, this.forward, delta * this.wheelSpeed);
        vec3.add(this._curEye, this._curEye, this.v3a);
        this.node.setWorldPosition(this._curEye);

        this.viewDist = vec3.distance(this._curEye, this._sceneViewCenter);
    }

    /**
     * 焦点转向某个节点
     * 如果传入 nodes，责转向这些节点
     * 如果未传入 nodes，责转向场景中心
     * @param {*} nodes
     */
    focus(nodes) {
        if (nodes) {
            if (nodes.length <= 0) { return; }
            nodes = nodes.map((id) => nodeManager.query(id));
            let worldPos = nodeUtils.getCenterWorldPos3D(nodes);
            let minRange = nodeUtils.getMinRangeOfNodes(nodes) * 4;

            this._sceneViewCenter = worldPos;

            this.node.getRotation(this._curRot);
            vec3.transformQuat(this.forward, this.id_forward, this._curRot);
            vec3.scale(this.v3c, this.forward, minRange);
            vec3.add(this.v3d, worldPos, this.v3c);

            const startPosition = this.node.getPosition();
            tween.position(startPosition, this.v3d, 300).step((position) => {
                this.node.setPosition(position);
            });
            return;
        }
        // set view dist
        this._sceneViewCenter = cc.v3();
        this.viewDist = vec3.distance(this.homePos, this._sceneViewCenter);

        const startPosition = this.node.getPosition();
        const startRotation = this.node.getRotation();
        tween.position(startPosition, this.homePos, 300).step((position) => {
            this.node.setPosition(position);
        });
        tween.rotation(startRotation, this.homeRot, 300).step((rotation) => {
            this.node.setRotation(rotation);
        });
    }

    onMouseDown(event) {
    }

    onMouseMove(event) {
    }

    onMouseUp(event) {
    }

    onMouseWheel(event) {
    }

    onKeyDown(event) {
    }

    onKeyUp(event) {
    }

    onUpdate() {
        if (this.camera_move_mode !== CameraMoveMode.WANDER) {
            return;
        }

        let eye = this._destEye;
        let rot = this._destRot;
        let dt =  cc.director.getDeltaTime();

        quat.rotateX(rot, rot, -this.curMouseDY * this.rotationSpeed);
        quat.rotateAround(rot, rot, cc.v3(0, 1, 0), -this.curMouseDX * this.rotationSpeed);
        quat.slerp(this._curRot, this._curRot, rot, dt * this.damping);
        vec3.scale(this.v3b, this.velocity, this.shiftKey ?
            this.movingSpeedShiftScale * dt : dt);
        vec3.transformQuat(this.v3b, this.v3b, this._curRot);
        vec3.add(eye, eye, this.v3b);
        vec3.lerp(this._curEye, this._curEye, eye, dt * this.damping);
        this.node.setPosition(this._curEye);
        this.node.setRotation(this._curRot);
        this.curMouseDX = 0;
        this.curMouseDY = 0;
    }
}

module.exports = CameraControllerBase;
