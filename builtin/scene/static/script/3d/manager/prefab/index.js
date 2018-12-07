'use strct';

/**
 * node._prefab
 *
 */

const nodeManager = require('../node');
const utils = require('./utils');
const ipc = require('../ipc');

nodeManager.on('changed', (node) => {
    if (!node.parent || node.parent instanceof cc.Scene) {
        return;
    }

    if (!!node.parent._prefab && !node._prefab) {
        link(node);
    }

    if (!node.parent._prefab && node._prefab) {
        // root 是自己，说明自己是 prefab 根节点，不需要剔除
        if (node._prefab.root === node) {
            return;
        }
        unlink(node);
    }
});

nodeManager.on('added', (node) => {
    if (node.parent && !!node.parent._prefab) {
        link(node);
    }
});
nodeManager.on('removed', (node) => {
    // root 是自己，说明自己是 prefab 根节点，不需要剔除
    if (node._prefab && node._prefab.root === node) {
        return;
    }
    unlink(node);
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
        asset = await ipc.send('query-asset-info', assetUuid);
    }

    // 发送节点修改消息
    nodeManager.emit('before-change', node);
    Manager.Ipc.send('broadcast', 'scene:before-node-change', node.uuid);

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
    nodeManager.emit('changed', node);
    Manager.Ipc.send('broadcast', 'scene:node-changed', node.uuid);
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
    Manager.Ipc.send('broadcast', 'scene:before-node-change', node.uuid);

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
    nodeManager.emit('changed', node);
    Manager.Ipc.send('broadcast', 'scene:node-changed', node.uuid);
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
    return Manager.Utils.serialize(prefab);
}

module.exports = {
    link,
    unlink,
    revert,
    sync,
    generate,
};
