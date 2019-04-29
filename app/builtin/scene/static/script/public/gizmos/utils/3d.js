'use strict';
const UtilsInterface = require('./utils-interface');
const operationManager = require('../../operation');
const selection = require('../../selection');

class Utils3D extends UtilsInterface {
    constructor() {
        super();
        this.baseDist = 600;
    }

    requestPointerLock() {
        operationManager.requestPointerLock();
    }

    exitPointerLock() {
        operationManager.exitPointerLock();
    }

    emitNodeMessage(message, ...params) {
        Manager.Node.emit(message, ...params);
    }

    broadcastMessage(message, ...params) {
        Manager.Ipc.send('broadcast', message, ...params);
    }

    onNodeChanged(node, ...param) {
        Manager.Node.emit('change', node, ...param);
        Manager.Ipc.send('broadcast', 'scene:change-node', node.uuid);
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

    getSqrMagnitude(inVec3) {
        return cc.vmath.vec3.sqrMag(inVec3);
    }

    select(uuid) {
        selection.clear();
        selection.select(uuid);
    }
}

module.exports = new Utils3D();
