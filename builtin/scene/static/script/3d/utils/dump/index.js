'use strict';

const dump = require('../../../../../dist/utils/dump');

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
    return dump.set(data, node);
}

async function restorePrefab(node, prefab) {
    const root = Manager.Node.query(prefab.rootUuid);

    const info = new cc._PrefabInfo();
    info.asset = Manager.Utils.serialize.asAsset(prefab.uuid);
    info.root = root ? root : node;
    info.fileId = node.uuid;
    node._prefab = info;
}

module.exports = {
    dumpNode,
    restoreProperty,
    restoreNode,
};
