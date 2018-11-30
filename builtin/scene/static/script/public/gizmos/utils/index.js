'use strict';
let GizmoConfig = require('../gizmo-config');

exports.GizmoUtils = require('./utils');

if (GizmoConfig.isCreator2x) {
    exports.requestPointerLock = function() {
        cc.game.canvas.requestPointerLock();
    };
    exports.exitPointerLock = function() {
        cc.game.canvas.exitPointerLock();
    };
    exports.broadcastMessage = function(message, param) {

    };

} else {
    const operationManager = require('../../operation');
    exports.requestPointerLock = function() {
        operationManager.requestPointerLock();
    };
    exports.exitPointerLock = function() {
        operationManager.exitPointerLock();
    };

    exports.broadcastMessage = function(message, param) {
        Manager.Ipc.send('broadcast', message, param);
    };
}

// module.exports = Utils;
