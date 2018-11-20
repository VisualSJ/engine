'use strict';

const { EventEmitter, } = require('events');

const UuidArray = require('./uuid-array');

/**
 * 节点选择管理器
 *
 * 因为场景需要根据选中的节点去渲染 gizmo 等物体，所以需要单独管理一套。
 * 理论上应该同 Editor 内的 Selection 插件管理的 node 数据一致。
 *
 * Event:
 * Selection.on('select', (uuid, uuids) => {
 *     // uuid 当前选中的节点
 *     // uuids 当前所有被选中的节点数据
 * });
 * Selection.on('unselect', (uuid, uuids) => {
 *     // uuid 当前取消选中的节点
 *     // uuids 当前所有被选中的节点数据
 * });
 */
class Selection extends EventEmitter {

    constructor() {
        super();
        this.uuids = new UuidArray();
        this.noticeTimer = null;
        this.selectUuids = new UuidArray();
        this.unselectUuids = new UuidArray();

        this.ray = cc.geometry.ray.create();
    }

    /**
     * 判断节点是否选中
     * @param {*} uuid
     */
    isSelect(uuid) {
        return this.uuids.indexOf(uuid) !== -1;
    }

    /**
     * 查询所有选中的节点 uuids 数组
     */
    query() {
        return this.uuids.uuids.splice();
    }

    /**
     * 选中某个节点
     * @param {*} uuid
     */
    select(uuid) {
        if (!this.uuids.add(uuid)) {
            return;
        }

        this.selectUuids.add(uuid);
        this.unselectUuids.remove(uuid);
        this.notice();

        this.emit('select', uuid, this.uuids.uuids.splice());
    }

    /**
     * 取消某个节点的选中状态
     * @param {*} uuid
     */
    unselect(uuid) {
        if (!this.uuids.remove(uuid)) {
            return;
        }

        this.selectUuids.remove(uuid);
        this.unselectUuids.add(uuid);
        this.notice();

        this.emit('unselect', uuid, this.uuids.uuids.splice());
    }

    /**
     * 取消所有节点的选中状态
     */
    clear() {
        this.uuids.forEach((uuid) => {
            this.selectUuids.remove(uuid);
            this.unselectUuids.add(uuid);
            this.emit('unselect', uuid);
        });
        this.uuids.clear();
        this.notice();
    }

    /**
     * 将缓存的队列通知给其他插件
     */
    notice() {
        clearTimeout(this.noticeTimer);
        this.noticeTimer = setTimeout(() => {
            Manager.Ipc.send('select-nodes', this.selectUuids.uuids);
            Manager.Ipc.send('unselect-nodes', this.unselectUuids.uuids);

            this.selectUuids.clear();
            this.unselectUuids.clear();
        }, 100);
    }

    /**
     * 通知管理器，该节点已经在编辑器内被选中
     * 这时候不需要发送选中消息给编辑器
     * @param {*} uuid
     */
    _select(uuid) {
        if (!this.uuids.add(uuid)) {
            return;
        }
        this.selectUuids.remove(uuid);
        this.unselectUuids.remove(uuid);
        this.emit('select', uuid, this.uuids.uuids.splice());
    }

    /**
     * 通知管理器，该节点已经在编辑器内被取消选中
     * 这时候不需要发送选中消息给编辑器
     * @param {*} uuid
     */
    _unselect(uuid) {
        if (!this.uuids.remove(uuid)) {
            return;
        }
        this.selectUuids.remove(uuid);
        this.unselectUuids.remove(uuid);
        this.emit('unselect', uuid, this.uuids.uuids.splice());
    }
}

////////////////////////////
// 内部以及工具函数

module.exports = new Selection();
