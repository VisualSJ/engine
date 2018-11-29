'use strict';

const { EventEmitter } = require('events');
const { createCamera, createGrid } = require('./utils');
const operationManager = require('../operation');
const NodeQueryUtils = require('../node');
const NodeUtils = require('../../../utils/node');

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
    if (fn.timer) return;
    fn.timer = setInterval(fn, tickInterval, ...args);
}

function stopTicking(fn) {
    if (!fn.timer) return;
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
        this.movingSpeed = 0.2;
        this.movingSpeedShiftScale = 3;
        this.rotationSpeed = 0.5;
        this.panningSpeed = 0.2;
        this.wheelSpeed = 0.1;

        this.homePos = cc.v3(50, 50, 50);
        this.homeRot = quat.fromViewUp(cc.quat(), vec3.normalize(v3a, this.homePos));
        // temps to store transform
        this.pos = cc.v3();
        this.rot = cc.quat();
        this.euler = cc.v3();
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

        // per-frame callback
        this.move = () => {
            this.node.getPosition(this.pos);
            this.node.getRotation(this.rot);
            vec3.scale(v3b, this.velocity, this.shiftKey ?
                this.movingSpeedShiftScale : 1);
            vec3.transformQuat(v3b, v3b, this.rot);
            this.node.setPosition(vec3.add(v3b, this.pos, v3b));
        };

        // tweening
        this.startPos = cc.v3();
        this.startRot = cc.quat();
        this.tween = (targetPos, targetRot, time = 300) => {
            let startMoveTime = Date.now();
            if (targetPos) this.node.getPosition(this.startPos);
            if (targetRot) this.node.getRotation(this.startRot);
            let tweening = () => {
                let curPassTime = Date.now() - startMoveTime;
                let t = curPassTime / time;
                if (t >= 1) { stopTicking(tweening); t = 1; }
                if (targetPos) this.node.setPosition(vec3.lerp(v3c, this.startPos, targetPos, t));
                if (targetRot) this.node.setRotation(quat.slerp(qt, this.startRot, targetRot, t));
            };
            startTicking(tweening);
        };
    }

    /**
     * 初始化摄像机并挂到场景中
     */
    init() {
        this._grid = createGrid(50, 50);
        this._camera = createCamera(cc.color(51, 51, 51, 255));
        this.node = this._camera.node;
        this.instance = this._camera._camera;
        this.camera_move_mode = CameraMoveMode.NONE;

        operationManager.on('mousedown', this.onMouseDown.bind(this));
        operationManager.on('mousemove', this.onMouseMove.bind(this));
        operationManager.on('mouseup', this.onMouseUp.bind(this));
        operationManager.on('wheel', this.onMouseWheel.bind(this));
        operationManager.on('keydown', this.onKeyDown.bind(this));
        operationManager.on('keyup', this.onKeyUp.bind(this));
        this.home();
    }

    onMouseDown(event) {
        this.node.getRotation(this.rot);
        if (event.middleButton) { // middle button: panning
            this.camera_move_mode = CameraMoveMode.PAN;
            this.node.getPosition(this.pos);
            vec3.transformQuat(this.right, this.id_right, this.rot);
            vec3.transformQuat(this.up, this.id_up, this.rot);
        } else if (event.rightButton) { // right button: rotation
            this.camera_move_mode = CameraMoveMode.WANDER;
            quat.toEuler(this.euler, this.rot);
            startTicking(this.move);
            $info.hidden = false;
        }
        operationManager.requestPointerLock();
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
        $info.hidden = true;
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
            case 'f': this.focusCameraToNodes(Selection.query()); break;
            case 'h': this.home(); break;
        }
    }

    home() {
        this.tween(this.homePos, this.homeRot);
    }

    focusCameraToNodes(nodes) {
        if (nodes.length <= 0) return;
        nodes = nodes.map((id) => NodeQueryUtils.query(id));
        let worldPos = NodeUtils.getCenterWorldPos3D(nodes);
        let minRange = NodeUtils.getMinRangeOfNodes(nodes) * 3;

        this.node.getRotation(this.rot);
        vec3.transformQuat(this.forward, this.id_forward, this.rot);
        vec3.scale(v3c, this.forward, minRange);
        vec3.add(v3d, worldPos, v3c);

        this.tween(v3d);
    }
}

module.exports = { CameraMoveMode, EditorCamera: new Camera() };
