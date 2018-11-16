'use strict';

const { createCamera, createGrid } = require('./utils');

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

class CameraTool {

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

        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        document.addEventListener('wheel', this.onMouseWheel.bind(this));
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    onMouseDown(e) {
        if (!e.button) {
            return;
        }
        cc.game.canvas.requestPointerLock();
        this.node.getRotation(this.rot);
        if (e.button === 1) { // middle button: panning
            this.node.getPosition(this.pos);
            vec3.transformQuat(this.right, this.id_right, this.rot);
            vec3.transformQuat(this.up, this.id_up, this.rot);
        } else if (e.button === 2) { // right button: rotation
            quat.toEuler(this.euler, this.rot);
            startTicking(this.move);
        }
    }

    onMouseMove(e) {
        if ((e.buttons & 6) === 0) {
            return;
        }
        let dx = e.movementX;
        let dy = e.movementY;
        if (e.buttons & 4) { // middle button: panning
            vec3.add(this.pos, this.pos, vec3.scale(v3a, this.right, -dx * this.panningSpeed));
            vec3.add(this.pos, this.pos, vec3.scale(v3a, this.up, dy * this.panningSpeed));
            this.node.setPosition(this.pos);
        } else if (e.buttons & 2) { // right button: rotation
            this.euler.x -= dy * this.rotationSpeed;
            this.euler.y -= dx * this.rotationSpeed;
            this.node.setRotationFromEuler(this.euler.x, this.euler.y, this.euler.z);
        }
        return true;
    }

    onMouseUp(e) {
        if (!e.button) {
            return;
        }
        document.exitPointerLock();
        if (e.button === 2) {
            stopTicking(this.move);
        }
    }

    onMouseWheel(e) {
        this.node.getPosition(this.pos);
        this.node.getRotation(this.rot);
        vec3.transformQuat(this.forward, this.id_forward, this.rot);
        vec3.scale(v3a, this.forward, e.deltaY * this.wheelSpeed);
        vec3.add(v3a, this.pos, v3a);
        this.node.setPosition(v3a);
    }

    onKeyDown(e) {
        this.shiftKey = e.shiftKey;
        switch (e.key.toLowerCase()) {
        case 'd': this.velocity.x = this.curMovSpeed; break;
        case 'a': this.velocity.x = -this.curMovSpeed; break;
        case 'e': this.velocity.y = this.curMovSpeed; break;
        case 'q': this.velocity.y = -this.curMovSpeed; break;
        case 's': this.velocity.z = this.curMovSpeed; break;
        case 'w': this.velocity.z = -this.curMovSpeed; break;
        }
    }

    onKeyUp(e) {
        this.shiftKey = e.shiftKey;
        switch (e.key.toLowerCase()) {
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

module.exports = new CameraTool();
