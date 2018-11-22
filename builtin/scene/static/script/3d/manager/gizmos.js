'use strict';

const scene = require('./scene');
const gizmo = require('../../public/gizmos');

scene.on('open', (error, scene) => {
    gizmo.onSceneLoaded();
});

scene.on('reload', (error, scene) => {
    gizmo.onSceneLoaded();
});

module.exports = gizmo;
