'use strict';

const scene = require('./scene');
const node = require('./node');
const { CameraMoveMode, EditorCamera } = require('./camera');
const gizmo = require('../../public/gizmos');

scene.on('open', (error, scene) => {
    gizmo.onSceneLoaded();
});

scene.on('reload', (error, scene) => {
    gizmo.onSceneLoaded();
});

node.on('changed', (node) => {
    gizmo.onNodeChanged(node);
});

node.on('removed', (node) => {
    gizmo.onNodeRemoved(node);
});

node.on('component-added', (comp, node) => {
    gizmo.onComponentAdded(comp, node);
});

node.on('before-component-remove', (comp, node) => {
    gizmo.onBeforeComponentRemove(comp, node);
});

EditorCamera.on('camera-move-mode', (mode) => {
    if (mode === CameraMoveMode.NONE) {
        gizmo.lockGizmoTool(false);
    } else if (mode === CameraMoveMode.WANDER) {
        gizmo.lockGizmoTool(true);
    }
});

module.exports = gizmo;
