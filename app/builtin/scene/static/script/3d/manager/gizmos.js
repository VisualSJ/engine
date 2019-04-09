'use strict';

const scene = require('./scene');
const nodeMgr = require('./node');
const compMgr = require('./component');
const EditorCamera = require('./camera');
const CameraMoveMode = EditorCamera.CameraMoveMode;
const gizmo = require('../../public/gizmos');
const operationMgr = require('./operation');

scene.on('open', (scene) => {
    gizmo.onSceneLoaded();
});

nodeMgr.on('change', (node) => {
    gizmo.onNodeChanged(node);
});

nodeMgr.on('add', (node) => {
    gizmo.onNodeAdded(node);
});

nodeMgr.on('remove', (node) => {
    gizmo.onNodeRemoved(node);
});

compMgr.on('add-component', (comp) => {
    gizmo.onComponentAdded(comp);
});

compMgr.on('before-remove-component', (comp) => {
    gizmo.onBeforeComponentRemove(comp);
});

EditorCamera.controller.on('camera-move-mode', (mode) => {
    if (mode === CameraMoveMode.NONE) {
        gizmo.lockGizmoTool(false);
    } else if (mode === CameraMoveMode.WANDER) {
        gizmo.lockGizmoTool(true);
    }
});

gizmo.TransformToolData.on('dimension-changed', (is2D) => {
    EditorCamera.is2D = is2D;
});

operationMgr.on('resize', () => {
    gizmo.onResize();
});

// 有些gizmo在引擎没有提供消息的情况下，需要使用update来更新数据
cc.director.on(cc.Director.EVENT_AFTER_UPDATE, () => {
    gizmo.onUpdate();
});

module.exports = gizmo;
