'use strict';

const { EventEmitter } = require('events');

const nodeManager = require('../node');
const compManager = require('../component');
const sceneManager = require('../scene');
const operationMgr = require('../operation');

const listener = require('./listener');
const utils = require('./utils');

const Controller2D = require('./2d');
const Controller3D = require('./3d');

/**
 * 摄像机管理器
 *
 * 编辑器视角与实际游戏视角是不同的，所以需要单独管理编辑器摄像机。
 * 编辑器模式下，游戏内的其他摄像机需要关闭（现阶段是在引擎内 hack 实现）。
 */
class Camera extends EventEmitter {
    constructor() {
        super();

        this.CameraMoveMode = utils.CameraMoveMode;
        this._controller2D = new Controller2D();
        this._controller3D = new Controller3D();
        this._controller = this._controller3D;
    }

    /**
     * 初始化摄像机并挂到场景中
     */
    init() {
        this._camera = utils.createCamera(cc.color(51, 51, 51, 255));

        this._controller2D.init(this._camera);
        this._controller3D.init(this._camera);

        listener.bind(this);
    }

    get controller() {
        return this._controller;
    }

    set is2D(value) {
        if (this._controller) {
            this._controller.active = false;
        }

        this._controller = value ? this._controller2D : this._controller3D;
        this._controller.active = true;
    }

    onSceneLoaded() {
        this._controller.active = true;
        this.focus();
    }

    /**
     * 焦点转向某个节点
     * 如果传入 nodes，责转向这些节点
     * 如果未传入 nodes，责转向场景中心
     * @param {*} nodes
     */
    focus(nodes) {
        this._controller.focus(nodes);
    }

    copyCameraDataToNodes(nodes) {
        this._controller.copyCameraDataToNodes(nodes);
    }

    onMouseDown(event) {
        return this._controller.onMouseDown(event);
    }

    onMouseMove(event) {
        return this._controller.onMouseMove(event);
    }

    onMouseUp(event) {
        return this._controller.onMouseUp(event);
    }

    onMouseWheel(event) {
        this._controller.onMouseWheel(event);
    }

    onKeyDown(event) {
        this._controller.onKeyDown(event);
    }

    onKeyUp(event) {
        this._controller.onKeyUp(event);
    }

    onUpdate() {
        this._controller.onUpdate(event);
    }

    onResize() {
        this._controller.onResize();
    }
}

const camera = module.exports = new Camera();

/**
 * 漫游模式下
 * 需要不停更新自身的位置数据
 */
cc.director.on(cc.Director.EVENT_AFTER_UPDATE, () => {
    camera.onUpdate();
});

// 场景打开后需要更新 camera
sceneManager.on('open', (scene) => {
    // 设置 debug 摄像机
    // scene._renderScene.setDebugCamera(camera.instance);

    // // 更新光源
    // camera._lightNodes = utils.queryLightNodes([camera._light.node]);
    // camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);

    camera.onSceneLoaded();
});

operationMgr.on('resize', () => {
    camera.onResize();
});

// 节点的 active 或者 comp 的 enable 修改的时候需要更新光源数据
// nodeManager.on('change', (node) => {
//     let index = camera._lightNodes.indexOf(node);
//     if (index !== -1) {
//         let lightComp = node.getComponent(cc.LightComponent);
//         if (!lightComp) {
//             camera._lightNodes.splice(index, 1);
//         }

//         camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
//     }
// });

// 如果删除的节点带有灯光，需要更新摄像机使用的光源数据
// nodeManager.on('remove', (node) => {
//     let index = camera._lightNodes.indexOf(node);
//     if (index !== -1) {
//         camera._lightNodes.splice(index, 1);
//         camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
//     }
// });

// 如果节点增加了 light，需要更新摄像机使用的光源数据
// compManager.on('add-component', (comp, node) => {
//     if (!(comp instanceof cc.LightComponent)) {
//         return;
//     }
//     if (!camera._lightNodes.includes(node)) {
//         camera._lightNodes.push(node);
//     }
//     camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
// });

// 如果节点删除，并且删除的节点带有 light，需要更新光源数据
// compManager.on('remove-component', (comp, node) => {
//     if (!(comp instanceof cc.LightComponent)) {
//         return;
//     }

//     let index = camera._lightNodes.indexOf(node);
//     if (index !== -1) {
//         camera._lightNodes.splice(index, 1);
//         camera._light.enabled = !utils.isSceneHasActiveLight(camera._lightNodes);
//     }
// });
