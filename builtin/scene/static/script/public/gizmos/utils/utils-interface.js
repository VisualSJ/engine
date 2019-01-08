'use strict';

// 适配两个引擎的接口
class UtilsInterface {
    constructor() {
        this.GizmoUtils = require('./utils');
        this.baseDist = 600;    // 用于Gizmo保持大小的一个参数
    }

    /**
     * 锁定并隐藏鼠标
     */
    requestPointerLock() {
    }

    /**
     * 退出鼠标的锁定
     */
    exitPointerLock() {
    }

    /**
     * 广播消息
     * @param {消息内容} message
     * @param {参数} param
     */
    broadcastMessage(message, param) {
    }

    /**
     * 获取Gizmo的根节点
     */
    getGizmoRoot() {
    }

    /**
     * 通知引擎立刻刷新，用于2dx中
     */
    repaintEngine() {
    }

    /**
     * 记录结点当前信息
     * @param {节点} nodes
     */
    recordChanges(nodes) {
    }

    /**
     * 提交结点变化信息
     * @param {*} nodes
     */
    commitChanges(nodes) {
    }

    getSqrMagnitude(inVec3) {
    }
}

module.exports = UtilsInterface;
