'use strict';

const { EventEmitter } = require('events');
const { createCamera, createGrid } = require('./utils');
const operationManager = require('../operation');
const NodeQueryUtils = require('../node');
const NodeUtils = require('../../../utils/node');
const Scene = require('../scene');

// wasd 按键提示
const $info = document.createElement('div');
$info.hidden = true;
$info.id = 'camera_info';
$info.innerHTML = `
<style>
    #camera_info { position: absolute; top: 10px; left: 10px; font-size: 12px; text-align: center; color: #fff; }
    #camera_info div { padding: 2px 0; }
    #camera_info span { border: 1px solid #fff; border-radius: 2px; padding: 0 4px; }
</style>
<div>
    <span>w</span>
</div>
<div>
    <span>a</span>
    <span>s</span>
    <span>d</span>
</div>
`;
document.body.appendChild($info);

const tickInterval = 1000 / 60; // 60fps
function startTicking(fn, ...args) {
    if (fn.timer) { return; }
    fn.timer = setInterval(fn, tickInterval, ...args);
}

function stopTicking(fn) {
    if (!fn.timer) { return; }
    clearInterval(fn.timer);
    fn.timer = 0;
}

let CameraMoveMode = cc.Enum({
    NONE: 0,
    ORBIT: 1,
    PAN: 2,
    ZOOM: 3,
    WANDER: 4, //漫游
});

const { vec3, quat } = cc.vmath;
let v3a = cc.v3(), v3b = cc.v3(); // moving
let v3c = cc.v3(), v3d = cc.v3(), qt = cc.quat(); // tweening

/**
 * 摄像机管理器
 *
 * 编辑器视角与实际游戏视角是不同的，所以需要单独管理编辑器摄像机。
 * 编辑器模式下，游戏内的其他摄像机需要关闭（现阶段是在引擎内 hack 实现）。
 */
class Camera extends EventEmitter {

    constructor() {
        super();
        // speed controller
        this.movingSpeed = 30;
        this.movingSpeedShiftScale = 3;
        this.rotationSpeed = 0.006;
        this.panningSpeed = 0.2;
        this.wheelSpeed = 0.1;
        this.damping = 20.0;

        this.homePos = cc.v3(50, 50, 50);
        this.homeRot = quat.fromViewUp(cc.quat(), vec3.normalize(v3a, this.homePos));
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

        // tweening
        this.startPos = cc.v3();
        this.startRot = cc.quat();
        this.tween = (targetPos, targetRot, time = 300) => {
            let startMoveTime = Date.now();
            if (targetPos) { this.node.getPosition(this.startPos); }
            if (targetRot) { this.node.getRotation(this.startRot); }
            let tweening = () => {
                let curPassTime = Date.now() - startMoveTime;
                let t = curPassTime / time;
                if (t >= 1) { stopTicking(tweening); t = 1; }
                if (targetPos) { this.node.setPosition(vec3.lerp(v3c, this.startPos, targetPos, t)); }
                if (targetRot) { this.node.setRotation(quat.slerp(qt, this.startRot, targetRot, t)); }
            };
            startTicking(tweening);
        };

        cc.director.on(cc.Director.EVENT_AFTER_UPDATE, this.onPostUpdate, this);
    }

    reset() {
        this.node.getWorldRotation(this._curRot);
        this._destRot = quat.clone(this._curRot);
        this.node.getWorldPosition(this._curEye);
        this._destEye = vec3.clone(this._curEye);
    }

    /**
     * 初始化摄像机并挂到场景中
     */
    init() {
        this._grid = createGrid(50, 50);
        [ this._camera, this._light ] = createCamera(cc.color(51, 51, 51, 255));
        this.node = this._camera.node;
        this.instance = this._camera._camera;
        this.camera_move_mode = CameraMoveMode.NONE;
        this.reset();

        operationManager.on('mousedown', this.onMouseDown.bind(this));
        operationManager.on('mousemove', this.onMouseMove.bind(this));
        operationManager.on('mouseup', this.onMouseUp.bind(this));
        operationManager.on('wheel', this.onMouseWheel.bind(this));
        operationManager.on('keydown', this.onKeyDown.bind(this));
        operationManager.on('keyup', this.onKeyUp.bind(this));
        this.home();

        Scene.on('open', (error, scene) => {
            this.onSceneLoaded();
        }, this);

        // add listener to node events
        NodeQueryUtils.on('changed', (node) => {
            this.onSceneNodeChanged(node);
        });
        NodeQueryUtils.on('removed', (node) => {
            this.onSceneNodeRemoved(node);
        });
        NodeQueryUtils.on('component-added', (comp, node) => {
            this.onComponentAdded(comp, node);
        }, this);
        NodeQueryUtils.on('component-removed', (comp, node) => {
            this.onSceneNodeChanged(node);
        }, this);

    }

    onSceneLoaded() {
        this._lightNodes = this.queryLightNodes();
        this.checkLightsState();
    }

    onComponentAdded(comp, node) {
        if (comp instanceof cc.LightComponent) {
            if (!this._lightNodes.includes(node)) {
                this._lightNodes.push(node);
            }
            this.checkLightsState();
        }
    }

    onSceneNodeRemoved(node) {
        let index = this._lightNodes.indexOf(node);
        if (index !== -1) {
            this._lightNodes.splice(index, 1);
            this.checkLightsState();
        }
    }

    // active/deactive, enabled/disabled
    onSceneNodeChanged(node) {
        let index = this._lightNodes.indexOf(node);
        if (index !== -1) {
            let lightComp = node.getComponent(cc.LightComponent);
            if (!lightComp) {
                this._lightNodes.splice(index, 1);
            }

            this.checkLightsState();
        }
    }

    queryLightNodes() {
        let lightNodes = [];
        let allNodeUuids = NodeQueryUtils.queryUuids();

        allNodeUuids.forEach((id) => {
            let node = NodeQueryUtils.query(id);
            // exclude editor light
            if (node !== this._light.node) {
                let lightComp = node.getComponent(cc.LightComponent);
                if (lightComp) {
                    lightNodes.push(node);
                }
            }
        });

        return lightNodes;
    }

    isSceneHasActiveLight() {
        let hasActive = false;
        let noLightNode = [];
        this._lightNodes.forEach((node) => {
            if (node.active) {
                let lightComp = node.getComponent(cc.LightComponent);
                if (lightComp) {
                    if (lightComp.enabled === true) {
                        hasActive = true;
                    }
                } else {
                    // need to remove node from list
                    noLightNode.push(node);
                }
            }
        });

        noLightNode.forEach((node) => {
            let index = this._lightNodes.indexOf(node);
            this._lightNodes.splice(index, 1);
        });

        return hasActive;
    }

    checkLightsState() {
        if (this.isSceneHasActiveLight()) {
            this._light.enabled = false;
        } else {
            this._light.enabled = true;
        }
    }

    updateViewCenterByDist(viewDist) {
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.forward, this.id_forward, this._curRot);
        vec3.scale(v3a, this.forward, viewDist);
        vec3.add(v3b, this._curEye, v3a);
        this._sceneViewCenter = v3b;
    }

    enterOrbitMode() {
        this.camera_move_mode = CameraMoveMode.ORBIT;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        this.viewDist = vec3.distance(this._curEye, this._sceneViewCenter);
    }

    enterPanMode() {
        this.camera_move_mode = CameraMoveMode.PAN;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.right, this.id_right, this._curRot);
        vec3.transformQuat(this.up, this.id_up, this._curRot);
        operationManager.requestPointerLock();
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    exitPanMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
        operationManager.exitPointerLock();

        this.updateViewCenterByDist(-this.viewDist);
    }

    enterWanderMode() {
        this.reset();
        this.camera_move_mode = CameraMoveMode.WANDER;
        $info.hidden = false;
        this.curMouseDX = 0;
        this.curMouseDY = 0;
        operationManager.requestPointerLock();
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    exitWanderMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
        operationManager.exitPointerLock();
        $info.hidden = true;

        this.updateViewCenterByDist(-this.viewDist);
    }

    onMouseDown(event) {
        if (this.camera_move_mode === CameraMoveMode.NONE) {
            if (event.leftButton && this.altKey) {
                this.enterOrbitMode();
                return false;
            } else if (event.middleButton) { // middle button: panning
                this.enterPanMode();
                return false;
            } else if (event.rightButton) { // right button: wander
                this.enterWanderMode();
                return false;
            }
        }
    }

    onMouseMove(event) {
        let dx = event.moveDeltaX;
        let dy = event.moveDeltaY;
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
            vec3.scale(v3a, this.right, -dx * this.panningSpeed);
            vec3.scale(v3b, this.up, dy * this.panningSpeed);
            vec3.add(this._curEye, this._curEye, v3a);
            vec3.add(this._curEye, this._curEye, v3b);
            this.node.setPosition(this._curEye);

            // update view center
            vec3.add(this._sceneViewCenter, this._sceneViewCenter, v3a);
            vec3.add(this._sceneViewCenter, this._sceneViewCenter, v3b);
            return false;
        } else if (this.camera_move_mode === CameraMoveMode.WANDER) { // right button: rotation
            this.curMouseDX = dx;
            this.curMouseDY = dy;
            return false;
        }
        return true;
    }

    onMouseUp(event) {
        if (event.leftButton) {
            if (this.camera_move_mode === CameraMoveMode.ORBIT) {
                this.camera_move_mode = CameraMoveMode.NONE;
                this.emit('camera-move-mode', this.camera_move_mode);
                return false;
            }
        } else if (event.middleButton) { // middle button: panning
            this.exitPanMode();
        } else if (event.rightButton) { // right button: wander
            this.exitWanderMode();
        }
    }

    onMouseWheel(event) {
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.forward, this.id_forward, this._curRot);
        vec3.scale(v3a, this.forward, event.wheelDeltaY * this.wheelSpeed);
        vec3.add(this._curEye, this._curEye, v3a);
        this.node.setPosition(this._curEye);

        this.viewDist = vec3.distance(this._curEye, this._sceneViewCenter);
    }

    onKeyDown(event) {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': this.velocity.x = this.curMovSpeed; break;
            case 'a': this.velocity.x = -this.curMovSpeed; break;
            case 'e': this.velocity.y = this.curMovSpeed; break;
            case 'q': this.velocity.y = -this.curMovSpeed; break;
            case 's': this.velocity.z = this.curMovSpeed; break;
            case 'w': this.velocity.z = -this.curMovSpeed; break;
        }
    }

    onKeyUp(event) {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': if (this.velocity.x > 0) { this.velocity.x = 0; } break;
            case 'a': if (this.velocity.x < 0) { this.velocity.x = 0; } break;
            case 'e': if (this.velocity.y > 0) { this.velocity.y = 0; } break;
            case 'q': if (this.velocity.y < 0) { this.velocity.y = 0; } break;
            case 's': if (this.velocity.z > 0) { this.velocity.z = 0; } break;
            case 'w': if (this.velocity.z < 0) { this.velocity.z = 0; } break;
            case 'h': this.home(); break;
        }
    }

    home() {
        // set view dist
        this._sceneViewCenter = cc.v3();
        this.viewDist = vec3.distance(this.homePos, this._sceneViewCenter);

        this.tween(this.homePos, this.homeRot);
    }

    focusCameraToNodes(nodes) {
        if (nodes.length <= 0) { return; }
        nodes = nodes.map((id) => NodeQueryUtils.query(id));
        let worldPos = NodeUtils.getCenterWorldPos3D(nodes);
        let minRange = NodeUtils.getMinRangeOfNodes(nodes) * 3;

        this._sceneViewCenter = worldPos;

        this.node.getRotation(this._curRot);
        vec3.transformQuat(this.forward, this.id_forward, this._curRot);
        vec3.scale(v3c, this.forward, minRange);
        vec3.add(v3d, worldPos, v3c);

        this.tween(v3d);
    }

    onPostUpdate() {

        if (this.camera_move_mode === CameraMoveMode.WANDER) {
            let eye = this._destEye;
            let rot = this._destRot;
            let dt =  cc.director.getDeltaTime();

            quat.rotateX(rot, rot, -this.curMouseDY * this.rotationSpeed);
            quat.rotateAround(rot, rot, cc.v3(0, 1, 0), -this.curMouseDX * this.rotationSpeed);
            quat.slerp(this._curRot, this._curRot, rot, dt * this.damping);
            vec3.scale(v3b, this.velocity, this.shiftKey ?
                this.movingSpeedShiftScale * dt : dt);
            vec3.transformQuat(v3b, v3b, this._curRot);
            vec3.add(eye, eye, v3b);
            vec3.lerp(this._curEye, this._curEye, eye, dt * this.damping);
            this.node.setPosition(this._curEye);
            this.node.setRotation(this._curRot);
            this.curMouseDX = 0;
            this.curMouseDY = 0;
        }
    }
}

module.exports = { CameraMoveMode, EditorCamera: new Camera() };
