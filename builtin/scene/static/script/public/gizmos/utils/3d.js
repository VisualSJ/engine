'use strict';
const UtilsInterface = require('./utils-interface');
const operationManager = require('../../operation');

class Utils3D extends UtilsInterface {

    requestPointerLock() {
        operationManager.requestPointerLock();
    }

    exitPointerLock() {
        operationManager.exitPointerLock();
    }

    broadcastMessage(message, param) {
        Manager.Ipc.send('broadcast', message, param);
    }

    getGizmoRoot() {
        return Manager.foregroundNode.getChildByName('gizmoRoot');
    }

    repaintEngine() {
        // do nothing
    }

    recordNode(node) {
        // todo
    }

    commitChanges(nodes) {
        // todo
    }
}

module.exports = new Utils3D();
