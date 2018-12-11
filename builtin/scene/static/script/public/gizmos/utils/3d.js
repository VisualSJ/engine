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
        let node = param;
        Manager.Node.emit('changed', node);
        Manager.Ipc.send('broadcast', message, node.uuid);
    }

    getGizmoRoot() {
        return Manager.foregroundNode.getChildByName('gizmoRoot');
    }

    repaintEngine() {
        // do nothing
    }

    recordChanges(nodes) {
        Manager.History.snapshot();
    }

    commitChanges(nodes) {
        // todo
    }
}

module.exports = new Utils3D();
