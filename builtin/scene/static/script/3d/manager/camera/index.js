'use strict';

const { createCamera, createGrid } = require('./utils');
const operationManager = require('../operation');

let vec3;
let quat;
let v3a;
let v3b;

function startTicking(fn) {
    if (fn.timer) {
        return;
    }
    fn.timer = setInterval(fn, 17);
}

function stopTicking(fn) {
    if (!fn.timer) {
        return;
    }
    clearInterval(fn.timer);
    fn.timer = 0;
}

/**
 * 摄像机管理器
 *
 * 编辑器视角与实际游戏视角是不同的，所以需要单独管理编辑器摄像机。
 * 编辑器模式下，游戏内的其他摄像机需要关闭（现阶段是在引擎内 hack 实现）。
 */

class Camera {

    constructor() {
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
        this.node = this._camera.node;
        this.instance = this._camera._camera;
        this.home();

        operationManager.on('mousedown', this.onMouseDown.bind(this));
        operationManager.on('mousemove', this.onMouseMove.bind(this));
        operationManager.on('mouseup', this.onMouseUp.bind(this));
        operationManager.on('wheel', this.onMouseWheel.bind(this));
        operationManager.on('keydown', this.onKeyDown.bind(this));
        operationManager.on('keyup', this.onKeyUp.bind(this));
    }

    onMouseDown(event) {
        operationManager.requestPointerLock();
        this.node.getRotation(this.rot);
        if (event.middleButton) { // middle button: panning
            this.node.getPosition(this.pos);
            vec3.transformQuat(this.right, this.id_right, this.rot);
            vec3.transformQuat(this.up, this.id_up, this.rot);
        } else if (event.rightButton) { // right button: rotation
            quat.toEuler(this.euler, this.rot);
            startTicking(this.move);
        }
    }

    onMouseMove(event) {
        let dx = event.moveDeltaX;
        let dy = event.moveDeltaY;
        if (event.middleButton) { // middle button: panning
            vec3.add(this.pos, this.pos, vec3.scale(v3a, this.right, -dx * this.panningSpeed));
            vec3.add(this.pos, this.pos, vec3.scale(v3a, this.up, dy * this.panningSpeed));
            this.node.setPosition(this.pos);
        } else if (event.rightButton) { // right button: rotation
            this.euler.x -= dy * this.rotationSpeed;
            this.euler.y -= dx * this.rotationSpeed;
            this.node.setRotationFromEuler(this.euler.x, this.euler.y, this.euler.z);
        }
        return true;
    }

    onMouseUp(event) {
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
}

module.exports = new Camera();
