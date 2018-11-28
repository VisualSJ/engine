'use strict';

const { EventEmitter } = require('events');
const { createCamera, createGrid } = require('./utils');
const operationManager = require('../operation');
const Selection = require('../selection');
const NodeQueryUtils = require('../node');
const NodeUtils = require('../../../utils/node');

let vec3;
let quat;
let v3a;
let v3b;

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

const tickINterval = 1000 / 60;   //60fps
function startTicking(fn, ...args) {
    if (fn.timer) {
        return;
    }
    $info.hidden = false;
    fn.timer = setInterval(fn, tickINterval, ...args);
}

function stopTicking(fn) {
    if (!fn.timer) {
        return;
    }
    $info.hidden = true;
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
        this.movingSpeed = 0.2;
        this.movingSpeedShiftScale = 3;
        this.rotationSpeed = 0.5;
        this.panningSpeed = 0.2;
        this.wheelSpeed = 0.1;
        // per-frame callback
        this.move = () => {
            this.node.getPosition(this.pos);
            this.node.getRotation(this.rot);
            vec3.scale(v3b, this.velocity, this.shiftKey ?
                this.movingSpeedShiftScale : 1);
            vec3.transformQuat(v3b, v3b, this.rot);
            this.node.setPosition(vec3.add(v3b, this.pos, v3b));
        };

        this.camera_focus_dist = 50;
        this.startCameraPos = cc.v3();
        this.tweenMoveUpdate = (offset, time) => {
            let curPassTime = Date.now() - this.startMoveTime;
            if (curPassTime >= time) {
                stopTicking(this.tweenMoveUpdate);
                this.pos = this.startCameraPos.add(offset);
            } else {
                let percentOffset = cc.v3();
                vec3.scale(percentOffset, offset, curPassTime / time);
                this.pos = this.startCameraPos.add(percentOffset);
            }
            this.node.setWorldPosition(this.pos);
        };
    }

    /**
     * 初始化摄像机并挂到场景中
     */
    init() {
        vec3 = cc.vmath.vec3;
        quat = cc.vmath.quat;
        v3a = vec3.create();
        v3b = vec3.create();

        // temps to store transform
        this.pos = vec3.create(50, 50, 50);
        this.rot = quat.create();
        this.euler = vec3.create();
        // temps to store directions
        this.id_right = vec3.create(1, 0, 0);
        this.id_up = vec3.create(0, 1, 0);
        this.id_forward = vec3.create(0, 0, 1);
        this.right = vec3.clone(this.id_right);
        this.up = vec3.clone(this.id_up);
        this.forward = vec3.clone(this.id_forward);
        // temps to store velocity
        this.velocity = vec3.create();
        this.curMovSpeed = this.movingSpeed;

        this._grid = createGrid(50, 50);
        this._camera = createCamera(cc.color(51, 51, 51, 255));
        this._camera.far = 10000;
        this.node = this._camera.node;
        this.instance = this._camera._camera;
        this.home();
        this.camera_move_mode = CameraMoveMode.NONE;

        operationManager.on('mousedown', this.onMouseDown.bind(this));
        operationManager.on('mousemove', this.onMouseMove.bind(this));
        operationManager.on('mouseup', this.onMouseUp.bind(this));
        operationManager.on('wheel', this.onMouseWheel.bind(this));
        operationManager.on('keydown', this.onKeyDown.bind(this));
        operationManager.on('keyup', this.onKeyUp.bind(this));
    }

    onMouseDown(event) {
        this.node.getRotation(this.rot);
        if (event.middleButton) { // middle button: panning
            this.camera_move_mode = CameraMoveMode.PAN;
            this.node.getPosition(this.pos);
            vec3.transformQuat(this.right, this.id_right, this.rot);
            vec3.transformQuat(this.up, this.id_up, this.rot);
            operationManager.requestPointerLock();
        } else if (event.rightButton) { // right button: rotation
            this.camera_move_mode = CameraMoveMode.WANDER;
            quat.toEuler(this.euler, this.rot);
            startTicking(this.move);
            operationManager.requestPointerLock();
        }

        this.emit('cameraMoveMode', this.camera_move_mode);
    }

    onMouseMove(event) {
        let dx = event.moveDeltaX;
        let dy = event.moveDeltaY;
        if (this.camera_move_mode === CameraMoveMode.PAN) { // middle button: panning
            vec3.add(this.pos, this.pos, vec3.scale(v3a, this.right, -dx * this.panningSpeed));
            vec3.add(this.pos, this.pos, vec3.scale(v3a, this.up, dy * this.panningSpeed));
            this.node.setPosition(this.pos);
            return false;
        } else if (this.camera_move_mode === CameraMoveMode.WANDER) { // right button: rotation
            this.euler.x -= dy * this.rotationSpeed;
            this.euler.y -= dx * this.rotationSpeed;
            this.node.setRotationFromEuler(this.euler.x, this.euler.y, this.euler.z);
            return false;
        }

        return true;
    }

    onMouseUp(event) {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('cameraMoveMode', this.camera_move_mode);
        operationManager.exitPointerLock();
        stopTicking(this.move);
    }

    onMouseWheel(event) {
        this.node.getPosition(this.pos);
        this.node.getRotation(this.rot);
        vec3.transformQuat(this.forward, this.id_forward, this.rot);
        vec3.scale(v3a, this.forward, event.wheelDeltaY * this.wheelSpeed);
        vec3.add(v3a, this.pos, v3a);
        this.node.setPosition(v3a);
    }

    onKeyDown(event) {
        this.shiftKey = event.shiftKey;

        if (event.key.toLowerCase() === 'f') {
            let selections = Selection.query();
            this.focusCameraToNodes(selections);
        }

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

    adjustSceneToNodes(ids, margin = 50) {
        vec3.set(v3a, 0, 0, 0);
        ids.forEach((id) => {
            let node = cc.engine.getInstanceById(id);
            vec3.add(v3a, v3a, node.getWorldPosition(v3b));
        });
        vec3.scale(v3a, v3a, 1 / ids.length);

        this.node.getRotation(this.rot);
        vec3.transformQuat(this.forward, this.id_forward, this.rot);
        vec3.add(v3a, v3a, vec3.scale(v3b, this.forward, margin));
        this.node.setPosition(v3a);
    }

    home(margin = 50) {
        this.node.setPosition(margin, margin, margin);
        this.node.lookAt(vec3.create());
    }

    focusCameraToPos(targetPos, dist) {
        let cameraDir = cc.v3();
        let offset = cc.v3();

        this.node.getRotation(this.rot);
        vec3.transformQuat(cameraDir, cc.v3(0, 0, -1), this.rot);
        vec3.scale(offset, cameraDir, -dist);
        targetPos.addSelf(offset);
        this.node.getWorldPosition(this.pos);
        vec3.sub(offset, targetPos, this.pos);

        let duration = 0.3;
        this.startMoveTime = Date.now();
        this.node.getWorldPosition(this.startCameraPos);
        startTicking(this.tweenMoveUpdate, offset, duration * 1000);
    }

    focusCameraToNodes(nodes) {
        if (nodes.length <= 0) {
            return;
        }

        nodes = nodes.map((id) => {
            return NodeQueryUtils.query(id);
        });

        let worldPos = NodeUtils.getCenterWorldPos3D(nodes);
        let minRange = NodeUtils.getMinRangeOfNodes(nodes);
        this.focusCameraToPos(worldPos, minRange * 3);
    }
}

module.exports = { CameraMoveMode, EditorCamera: new Camera() };
