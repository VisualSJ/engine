'use strict';

const { createCamera, createGrid } = require('./utils');

const manager = {
    operation: require('../operation'),
};

/**
 * 摄像机管理器
 *
 * 编辑器视角与实际游戏视角是不同的，所以需要单独管理编辑器摄像机。
 * 编辑器模式下，游戏内的其他摄像机需要关闭（现阶段是在引擎内 hack 实现）。
 */

let v3a = null;
let v3b = null;

class Camrea {

    /**
     * 初始化摄像机并且挂到 renderer 上
     */
    init() {

        if (!cc.Object.Flags.HideInHierarchy) {
            console.warn('cc.Object.Flags.HideInHierarchy is not define.');

            cc.Object.Flags.HideInHierarchy = 1 << 10;
        }

        v3a = cc.vmath.vec3.create();
        v3b = cc.vmath.vec3.create();

        // speed controller
        this.movingSpeed = 0.2;
        this.movingSpeedShiftScale = 3;
        this.rotationSpeed = 0.5;
        this.panningSpeed = 0.2;
        this.wheelSpeed = 0.1;

        // temps to store transform
        this.pos = cc.vmath.vec3.create(50, 50, 50);
        this.rot = cc.vmath.quat.create();
        this.euler = cc.vmath.vec3.create();
        // temps to store directions
        this.id_right = cc.vmath.vec3.create(1, 0, 0);
        this.id_up = cc.vmath.vec3.create(0, 1, 0);
        this.id_forward = cc.vmath.vec3.create(0, 0, 1);
        this.right = cc.vmath.vec3.clone(this.id_right);
        this.up = cc.vmath.vec3.clone(this.id_up);
        this.forward = cc.vmath.vec3.clone(this.id_forward);
        // temps to store velocity
        this.velocity = cc.vmath.vec3.create();
        this.curMovSpeed = this.movingSpeed;

        // 用于编辑器绘制的背景和前景节点
        this.foregroundNode = new cc.Node('Editor Scene Foreground');
        this.backgroundNode = new cc.Node('Editor Scene Background');
        // 编辑器使用的节点不需要存储和显示在层级管理器
        this.foregroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
        this.backgroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);

        // 摄像机节点
        this.camera = createCamera(cc.color(51, 51, 51, 255));
        this.camera.node.parent = this.backgroundNode;
        this.camera.node.setPosition(50, 50, 50);
        this.camera.node.lookAt(cc.vmath.vec3.create());

        // 网格
        this.grid = createGrid(50, 50);
        this.grid.parent = this.backgroundNode;

        // 这些节点应该是常驻节点
        cc.game.addPersistRootNode(this.foregroundNode);
        cc.game.addPersistRootNode(this.backgroundNode);
    }

    /**
     * 将场景调整到窗口正中间
     * @param {*} margin
     */
    adjustToCenter(margin) {}
}

const camera = module.exports = new Camrea();

// 缩放
manager.operation.on('zoom', (data) => {
    camera.camera.node.getPosition(camera.pos);
    camera.camera.node.getRotation(camera.rot);
    cc.vmath.vec3.transformQuat(camera.forward, camera.id_forward, camera.rot);
    cc.vmath.vec3.scale(v3a, camera.forward, data.offset * camera.wheelSpeed);
    cc.vmath.vec3.add(v3a, camera.pos, v3a);
    camera.camera.node.setPosition(v3a);
});

// canvas 大小变化
manager.operation.on('resize', (data) => {
    if (!window.cc) {
        return;
    }
    cc.view.setCanvasSize(data.width, data.height);
    cc.view.setDesignResolutionSize(data.width, data.height, camera.policy);
});

// 拖拽移动
manager.operation.on('move-start', (data) => {
    const vec3 = cc.vmath.vec3;
    const node = camera.camera.node;

    document.body.style.cursor = '-webkit-grabbing';
    node.getRotation(camera.rot);
    node.getPosition(camera.pos);
    vec3.transformQuat(camera.right, camera.id_right, camera.rot);
    vec3.transformQuat(camera.up, camera.id_up, camera.rot);
});
manager.operation.on('move-change', (data) => {
    const vec3 = cc.vmath.vec3;

    vec3.add(camera.pos, camera.pos, vec3.scale(v3a, camera.right, -data.offsetX * camera.panningSpeed));
    vec3.add(camera.pos, camera.pos, vec3.scale(v3a, camera.up, data.offsetY * camera.panningSpeed));
    camera.camera.node.setPosition(camera.pos);
});
manager.operation.on('move-end', (data) => {
    document.body.style.cursor = '';
});

// 旋转
manager.operation.on('rotation-start', () => {
    const quat = cc.vmath.quat;

    document.body.style.cursor = 'all-scroll';
    quat.toEuler(camera.euler, camera.rot);
});
manager.operation.on('rotation-change', (data) => {
    const vec3 = cc.vmath.vec3;
    const node = camera.camera.node;

    camera.euler.x -= data.offsetY * camera.rotationSpeed;
    camera.euler.y -= data.offsetX * camera.rotationSpeed;
    node.setRotationFromEuler(camera.euler.x, camera.euler.y, camera.euler.z);

    node.getPosition(camera.pos);
    node.getRotation(camera.rot);
    vec3.scale(v3b, camera.velocity, 1);
        // camera.shiftKey ? camera.movingSpeedShiftScale : 1);
    vec3.transformQuat(v3b, v3b, camera.rot);
    node.setPosition(vec3.add(v3b, camera.pos, v3b));
});
manager.operation.on('rotation-end', () => {
    document.body.style.cursor = '';
});
