'use strict';

const UtilsInterface = require('./utils-interface');
const AnimUtils = Editor.require('scene://utils/animation');

class Utils2D extends UtilsInterface {
    constructor() {
        super();
        this.baseDist = 500;
    }
    requestPointerLock() {
        cc.game.canvas.requestPointerLock();
    }
    exitPointerLock() {
        document.exitPointerLock();
    }
    broadcastMessage(message, node, param) {

    }
    getGizmoRoot() {
        return _Scene.view.foregroundNode.getChildByName('gizmoRoot');
    }
    repaintEngine() {
        //creator2d中Node位置设置后要通知Engine及时更新
        if (cc.engine) {
            cc.engine.repaintInEditMode();
        }
    }
    recordChanges(nodes) {
        nodes.forEach((node) => {
            _Scene.Undo.recordNode(node.uuid);
        });
    }

    commitChanges(nodes) {
        AnimUtils.recordNodeChanged(nodes);
        _Scene.Undo.commit();
    }

    getSqrMagnitude(inVec3) {
        return cc.vmath.vec3.squaredMagnitude(inVec3);
    }
}

module.exports = new Utils2D();
