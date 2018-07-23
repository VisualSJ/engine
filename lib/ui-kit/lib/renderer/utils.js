'use strict';
/**
 * 取给定边界范围的值
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
function clamp (val, min, max) {
    return Math.min.call(null, Math.max.call(null, val, min), max);
}
// 点击外部需要隐藏的节点列表
const nodeList = [];
let startClick;

document.addEventListener('mousedown', e => {
    startClick = e;
});

document.addEventListener('mouseup', e => {
    nodeList.forEach(node => {
        node.handleClickOutside && node.handleClickOutside(e, startClick);
    });
});

exports.clamp = clamp;
exports.nodeList = nodeList;
