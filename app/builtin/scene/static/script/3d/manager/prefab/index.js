'use strct';

/**
 * node._prefab
 *
 */

const nodeManager = require('../node');
const utils = require('./utils');
const ipc = require('../ipc');

nodeManager.on('change', (node) => {
    if (node._prefab) {
        if (node._prefab.root === node) { // root 是自己，说明自己是 prefab 根节点，不需要剔除
            return;
        }

        if (node.parent && node.parent._prefab) { // 自己的父级是 prefab 符合规则，不需要剔除
            return;
        }

        unlink(node);
    } else {
        if (!node.parent || !node.parent._prefab) {
            return;
        }

        link(node);
    }
});

nodeManager.on('add', (node) => {
    if (node.parent && !!node.parent._prefab) {
        link(node);
    }
});

nodeManager.on('remove', (node) => {

});

/**
 * 将一个 node 与一个 prefab 关联到一起
 * @param {*} nodeUuid 也支持 node 对象
 * @param {*} assetUuid TODO: 待定
 */
async function link(nodeUuid, assetUuid) {
    let node = nodeUuid;
    if (typeof nodeUuid === 'string') {
        node = nodeManager.query(nodeUuid);
    }

    let asset = assetUuid;
    if (typeof assetUuid === 'string') {
        asset = Manager.Utils.serialize.asAsset(assetUuid);
    }

    // 发送节点修改消息
    nodeManager.emit('before-change', node);
    Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', node.uuid);

    const parentPrefab = node.parent._prefab;

    const info = new cc._PrefabInfo();
    info.asset = asset || parentPrefab.asset;
    info.root = parentPrefab.root;
    info.fileId = node.uuid;
    node._prefab = info;

    if (Array.isArray(node.children)) {
        node.children.forEach((child) => {
            if (!!child.parent._prefab && !child._prefab) {
                link(child);
            }
        });
    }

    // 发送节点修改消息
    nodeManager.emit('change', node);
    Manager.Ipc.forceSend('broadcast', 'scene:change-node', node.uuid);
}

/**
 * 将一个节点，与当前挂载的 prefab 解除连接
 * @param {*} nodeUuid 也支持 node 对象
 */
function unlink(nodeUuid) {

    let node = nodeUuid;
    if (typeof nodeUuid === 'string') {
        node = nodeManager.query(nodeUuid);
    }

    // 发送节点修改消息
    nodeManager.emit('before-change', node);
    Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', node.uuid);

    node._prefab = undefined;

    if (Array.isArray(node.children)) {
        node.children.forEach((child) => {
            if (!child.parent._prefab && child._prefab) {
                // root 是自己，说明自己是 prefab 根节点，不需要剔除
                if (child._prefab.root === child) {
                    return;
                }
                unlink(child);
            }
        });
    }

    // 发送节点修改消息
    nodeManager.emit('change', node);
    Manager.Ipc.forceSend('broadcast', 'scene:change-node', node.uuid);
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
    Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', node.uuid);

    utils.walkNode(node, (child) => {
        const info = new cc._PrefabInfo();
        info.asset = prefab;
        info.root = node;
        info.fileId = child.uuid; // todo fileID
        child._prefab = info;
    });

    // 发送节点修改消息
    nodeManager.emit('change', node);
    Manager.Ipc.forceSend('broadcast', 'scene:change-node', node.uuid);

    const dump = utils.getDumpableNode(node);
    prefab.data = dump;
    return Manager.Utils.serialize(prefab);
}

module.exports = {
    link,
    unlink,
    revert,
    sync,
    generate,
};
