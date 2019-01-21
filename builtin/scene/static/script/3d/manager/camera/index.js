'use strict';

const { EventEmitter } = require('events');
const { vec3, quat } = cc.vmath;

const nodeUtils = require('../../../utils/node');

const operationManager = require('../operation');
const nodeManager = require('../node');
const sceneManager = require('../scene');

const listener = require('./listener');
const utils = require('./utils');
const tween = require('./tween');

/**
 * 摄像机管理器
 *
 * 编辑器视角与实际游戏视角是不同的，所以需要单独管理编辑器摄像机。
 * 编辑器模式下，游戏内的其他摄像机需要关闭（现阶段是在引擎内 hack 实现）。
 */
class Camera extends EventEmitter {

    constructor() {
        super();

        this.CameraMoveMode = cc.Enum({
            NONE: 0,
            ORBIT: 1,
            PAN: 2,
            ZOOM: 3,
            WANDER: 4, //漫游
        });

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

    /**
     * 初始化摄像机并挂到场景中
     */
    init() {
        this._grid = utils.createGrid(50, 50);
        [ this._camera, this._light ] = utils.createCamera(cc.color(51, 51, 51, 255));
        this.node = this._camera.node;
        this.camera_move_mode = this.CameraMoveMode.NONE;
        this.reset();

        listener.bind(this);
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
        this.camera_move_mode = this.CameraMoveMode.ORBIT;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        this.viewDist = vec3.distance(this._curEye, this._sceneViewCenter);
    }

    /**
     * 退出 Orbit 操作模式
     */
    exitOrbitMode() {
        this.camera_move_mode = this.CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 进入 Pan 操作模式
     */
    enterPanMode() {
        this.camera_move_mode = this.CameraMoveMode.PAN;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.right, this.id_right, this._curRot);
        vec3.transformQuat(this.up, this.id_up, this._curRot);
        operationManager.requestPointerLock();
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 退出 Pan 操作模式
     */
    exitPanMode() {
        this.camera_move_mode = this.CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
        operationManager.exitPointerLock();

        this.updateViewCenterByDist(-this.viewDist);
    }

    /**
     * 进入 Wander 操作模式
     */
    enterWanderMode() {
        this.reset();
        this.camera_move_mode = this.CameraMoveMode.WANDER;
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
        this.camera_move_mode = this.CameraMoveMode.NONE;
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
        if (camera.camera_move_mode === this.CameraMoveMode.ORBIT) {
            let rot = camera._curRot;
            quat.rotateX(rot, rot, -dy * camera.rotationSpeed);
            quat.rotateAround(rot, rot, cc.v3(0, 1, 0), -dx * camera.rotationSpeed);
            let offset = cc.v3(0, 0, camera.viewDist);
            vec3.transformQuat(offset, offset, rot);
            vec3.add(camera._curEye, camera._sceneViewCenter, offset);
            camera.node.setWorldPosition(camera._curEye);
            camera.node.setRotation(rot);
        } else if (camera.camera_move_mode === this.CameraMoveMode.PAN) { // middle button: panning
            vec3.scale(camera.v3a, camera.right, -dx * camera.panningSpeed);
            vec3.scale(camera.v3b, camera.up, dy * camera.panningSpeed);
            vec3.add(camera._curEye, camera._curEye, camera.v3a);
            vec3.add(camera._curEye, camera._curEye, camera.v3b);
            camera.node.setWorldPosition(camera._curEye);

            // update view center
            vec3.add(camera._sceneViewCenter, camera._sceneViewCenter, camera.v3a);
            vec3.add(camera._sceneViewCenter, camera._sceneViewCenter, camera.v3b);
            return false;
        } else if (camera.camera_move_mode === this.CameraMoveMode.WANDER) { // right button: rotation
            camera.curMouseDX = dx;
            camera.curMouseDY = dy;
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
            let minRange = nodeUtils.getMinRangeOfNodes(nodes) * 3;

            this._sceneViewCenter = worldPos;

            this.node.getRotation(this._curRot);
            vec3.transformQuat(this.forward, this.id_forward, this._curRot);
            vec3.scale(this.v3c, this.forward, minRange);
            vec3.add(this.v3d, worldPos, this.v3c);

            const startPosition = camera.node.getPosition();
            tween.position(startPosition, this.v3d, 300).step((position) => {
                this.node.setPosition(position);
            });
            return;
        }
        // set view dist
        this._sceneViewCenter = cc.v3();
        this.viewDist = vec3.distance(this.homePos, this._sceneViewCenter);

        const startPosition = camera.node.getPosition();
        const startRotation = camera.node.getRotation();
        tween.position(startPosition, this.homePos, 300).step((position) => {
            this.node.setPosition(position);
        });
        tween.rotation(startRotation, this.homeRot, 300).step((rotation) => {
            this.node.setRotation(rotation);
        });
    }
}

const camera = module.exports = new Camera();

/**
 * 漫游模式下
 * 需要不停更新自身的位置数据
 */
cc.director.on(cc.Director.EVENT_AFTER_UPDATE, () => {
    if (camera.camera_move_mode !== camera.CameraMoveMode.WANDER) {
        return;
    }

    let eye = camera._destEye;
    let rot = camera._destRot;
    let dt =  cc.director.getDeltaTime();

    quat.rotateX(rot, rot, -camera.curMouseDY * camera.rotationSpeed);
    quat.rotateAround(rot, rot, cc.v3(0, 1, 0), -camera.curMouseDX * camera.rotationSpeed);
    quat.slerp(camera._curRot, camera._curRot, rot, dt * camera.damping);
    vec3.scale(camera.v3b, camera.velocity, camera.shiftKey ?
        camera.movingSpeedShiftScale * dt : dt);
    vec3.transformQuat(camera.v3b, camera.v3b, camera._curRot);
    vec3.add(eye, eye, camera.v3b);
    vec3.lerp(camera._curEye, camera._curEye, eye, dt * camera.damping);
    camera.node.setPosition(camera._curEye);
    camera.node.setRotation(camera._curRot);
    camera.curMouseDX = 0;
    camera.curMouseDY = 0;
});

// 场景打开后需要更新 camera
sceneManager.on('open', (error, scene) => {
    // 设置 debug 摄像机
    // scene._renderScene.setDebugCamera(camera.instance);

    // 更新光源
    camera._lightNodes = utils.queryLightNodes([camera._light.node]);
    camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);

    // 摄像机对准到中心点
    camera.focus();
});

// 节点的 active 或者 comp 的 enable 修改的时候需要更新光源数据
nodeManager.on('changed', (node) => {
    let index = camera._lightNodes.indexOf(node);
    if (index !== -1) {
        let lightComp = node.getComponent(cc.LightComponent);
        if (!lightComp) {
            camera._lightNodes.splice(index, 1);
        }

        camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
    }
});

// 如果删除的节点带有灯光，需要更新摄像机使用的光源数据
nodeManager.on('removed', (node) => {
    let index = camera._lightNodes.indexOf(node);
    if (index !== -1) {
        camera._lightNodes.splice(index, 1);
        camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
    }
});

// 如果节点增加了 light，需要更新摄像机使用的光源数据
nodeManager.on('component-added', (comp, node) => {
    if (!(comp instanceof cc.LightComponent)) {
        return;
    }
    if (!camera._lightNodes.includes(node)) {
        camera._lightNodes.push(node);
    }
    camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
});

// 如果节点删除，并且删除的节点带有 light，需要更新光源数据
nodeManager.on('component-removed', (comp, node) => {
    if (!(comp instanceof cc.LightComponent)) {
        return;
    }

    let index = camera._lightNodes.indexOf(node);
    if (index !== -1) {
        camera._lightNodes.splice(index, 1);
        camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
    }
});
