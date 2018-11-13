'use strict';

const manager = {
    camera: require('../camera'),
    operation: require('../operation'),
};

const select = require('./select');
const { EventEmitter } = require('events');

const UuidArray = require('./uuid-array');

/**
 * 节点选择管理器
 *
 * 因为场景需要根据选中的节点去渲染 gizmo 等物体，所以需要单独管理一套。
 * 理论上应该同 Editor 内的 Selection 插件管理的 node 数据一致。
 *
 */
class Selection extends EventEmitter {

    constructor() {
        super();
        this.uuids = new UuidArray();
        this.noticeTimer = null;
        this.selectUuids = new UuidArray();
        this.unselectUuids = new UuidArray();
    }

    /**
     * 判断节点是否选中
     * @param {*} uuid
     */
    isSelect(uuid) {
        return this.uuids.indexOf(uuid) !== -1;
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
    }

    /**
     * 取消所有节点的选中状态
     */
    clear() {
        this.uuids.forEach((uuid) => {
            this.selectUuids.remove(uuid);
            this.unselectUuids.add(uuid);
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
}

////////////////////////////
// 内部以及工具函数

const selection = module.exports = new Selection();

const $mask = document.createElement('div');
$mask.style.background = '#09f';
$mask.style.position = 'absolute';
$mask.style.opacity = 0.4;
$mask.style.border = '1px solid #cae8fb';

// manager.operation.on('rect-start', () => {
//     $mask.style.left = '0px';
//     $mask.style.top = '0px';
//     $mask.style.width = '0px';
//     $mask.style.height = '0px';

//     document.body.appendChild($mask);
// });
// manager.operation.on('rect-change', (data) => {
//     $mask.style.left = data.x + 'px';
//     $mask.style.top = data.y + 'px';
//     $mask.style.width = data.width + 'px';
//     $mask.style.height = data.height + 'px';

//     const scale = manager.camera.scale;
//     const point = manager.camera.translatePoint({
//         x: data.x,
//         y: data.y + data.height,
//     });

//     let nodes = select.rectTest(point.x, point.y, data.width / scale, data.height / scale);
//     selection.clear();
//     (nodes || []).forEach((node) => {
//         selection.select(node.uuid);
//     });
// });
// manager.operation.on('rect-end', () => {
//     document.body.removeChild($mask);
// });

// 点选操作
// manager.operation.on('hit', (data) => {
//     let node = select.hitTest(manager.camera.translatePoint(data));
//     selection.clear();
//     node && selection.select(node.uuid);
// });
