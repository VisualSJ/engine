'use strict';

const manager = {
    camera: require('./camera'),
};

const utils = {
    select: require('../utils/select'),
};

/**
 * 节点选择管理器
 *
 * 因为场景需要根据选中的节点去渲染 gizmo 等物体，所以需要单独管理一套。
 * 理论上应该同 Editor 内的 Selection 插件管理的 node 数据一致。
 *
 * todo 暂时未完成
 */

 /**
  * 判断节点是否选中
  * @param {*} uuid
  */
function isSelect(uuid) {

}

 /**
  * 选中某个节点
  * @param {*} uuid
  */
function select(uuid) {

}

/**
 * 取消某个节点的选中状态
 * @param {*} uuid
 */
function unselect(uuid) {

}

module.exports = {
    isSelect,
    select,
    unselect,
};

const $mask = document.createElement('div');
$mask.style.background = '#09f';
$mask.style.position = 'absolute';
$mask.style.opacity = 0.4;
$mask.style.border = '1px solid #cae8fb';

// 框选操作
document.addEventListener('mousedown', (event) => {
    if (event.button !== 0) {
        return;
    }

    $mask.style.left = '0px';
    $mask.style.top = '0px';
    $mask.style.width = '0px';
    $mask.style.height = '0px';

    document.body.appendChild($mask);
    // 点击的起始点
    const start = { x: event.pageX, y: event.pageY };
    const end = { x: event.pageX, y: event.pageY };

    const move = (event) => {
        // 移动的位置点
        end.x = event.pageX;
        end.y = event.pageY;

        $mask.style.left = Math.min(start.x, end.x) + 'px';
        $mask.style.top = Math.min(start.y, end.y) + 'px';
        $mask.style.width = Math.abs(start.x - end.x) + 'px';
        $mask.style.height = Math.abs(start.y - end.y) + 'px';
    };

    const up = () => {
        document.body.removeChild($mask);

        const point = manager.camera.translatePoint({
            x: Math.min(start.x, end.x),
            y: Math.max(start.y, end.y),
        });
        const size = {
            width: Math.abs(start.x - end.x) / manager.camera.scale,
            height: Math.abs(start.y - end.y) / manager.camera.scale,
        };

        let nodes = utils.select.rectTest(point.x, point.y, size.width, size.height);
        Manager.Ipc.send('select-nodes', nodes ? nodes.map((node) => { return node.uuid; }) : []);

        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
});

// 点选操作
document.addEventListener('click', (event) => {
    const point = {
        x: event.pageX,
        y: event.pageY,
    };
    let node = utils.select.hitTest(manager.camera.translatePoint(point));
    Manager.Ipc.send('select-nodes', node ? [node.uuid] : []);
});
