'use strict';

const dump = require('../../../../../dist/utils/dump/index');

/**
 * 生成一个 node 的 dump 数据
 * @param {*} node
 */
function dumpNode(node) {
    if (!node) {
        return null;
    }

    return dump.get(node);
}

function dumpComponent(comp) {
    if (!comp) {
        return null;
    }
    return dump.getComponent(comp);
}

/**
 * 恢复一个 dump 数据到 property
 * @param node
 * @param path
 * @param data
 */
async function restoreProperty(node, path, data) {
    return dump.patch(path, data, node);
}

/**
 * 还原一个节点的全部属性
 * @param {*} node
 * @param {*} dump
 */
async function restoreNode(node, data) {
    return await dump.set(data, node);
}

module.exports = {
    dumpNode,
    dumpComponent,
    restoreProperty,
    restoreNode,
};
