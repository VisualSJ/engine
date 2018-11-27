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

node.on('change', (node) => {
    gizmo.onNodeChanged(node);
});

EditorCamera.on('cameraMoveMode', (mode) => {
    if (mode === CameraMoveMode.NONE) {
        gizmo.lockGizmoTool(false);
    } else if (mode === CameraMoveMode.WANDER) {
        gizmo.lockGizmoTool(true);
    }
});

module.exports = gizmo;
