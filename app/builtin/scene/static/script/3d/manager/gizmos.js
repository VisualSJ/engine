'use strict';

const scene = require('./scene');
const nodeMgr = require('./node');
const compMgr = require('./component');
const EditorCamera = require('./camera');
const CameraMoveMode = EditorCamera.CameraMoveMode;
const gizmo = require('../../public/gizmos');

scene.on('open', (error, scene) => {
    gizmo.onSceneLoaded();
});

scene.on('reload', (error, scene) => {
    gizmo.onSceneLoaded();
});

nodeMgr.on('changed', (node) => {
    gizmo.onNodeChanged(node);
});

nodeMgr.on('removed', (node) => {
    gizmo.onNodeRemoved(node);
});

compMgr.on('component-added', (comp) => {
    gizmo.onComponentAdded(comp);
});

compMgr.on('before-component-remove', (comp) => {
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

module.exports = gizmo;
