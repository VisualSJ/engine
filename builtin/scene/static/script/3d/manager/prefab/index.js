'use strct';

/**
 * node._prefab
 *
 */

const nodeManager = require('../node');
const utils = require('./utils');

/**
 * 将一个 node 与一个 prefab 关联到一起
 * @param {*} assetUuid
 * @param {*} nodeUuid
 */
function link(nodeUuid, assetUuid) {
    const asset = cc.AssetLibrary.load();
}

/**
 * 将一个节点，与当前挂载的 prefab 解除连接
 * @param {*} nodeUuid
 */
function unlink(nodeUuid) {

}

/**
 * 将一个节点恢复到关联的 prefab 的状态
 * @param {*} nodeUuid
 */
function revert(nodeUuid) {

}

/**
 * 将一个节点的修改，应用到关联的 prefab 上
 * @param {*} nodeUuid
 */
function sync(nodeUuid) {

}

/**
 * 从一个节点创建出一个 prefab json
 * @param {*} nodeUuid
 */
function generate(nodeUuid) {
    const node = nodeManager.query(nodeUuid);
    const prefab = new cc.Prefab();

    // 发送节点修改消息
    nodeManager.emit('before-change', node);
    Manager.Ipc.send('broadcast', 'scene:before-node-change', node.uuid);

    utils.walkNode(node, (child) => {
        const info = new cc._PrefabInfo();
        info.asset = prefab;
        info.root = node;
        info.fileId = child.uuid; // todo fileID
        child._prefab = info;
    });

    // 发送节点修改消息
    nodeManager.emit('changed', node);
    Manager.Ipc.send('broadcast', 'scene:node-changed', node.uuid);

    const dump = utils.getDumpableNode(node);
    prefab.data = dump;
    return Manager.serialize(prefab);
}

module.exports = {
    link,
    unlink,
    revert,
    sync,
    generate,
};
