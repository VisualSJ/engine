'use strict';

const manager = {
    node: require('./node'),
};

const camera = require('./camera');
const { promisify } = require('util');

let currentSceneData = null;

/**
 * 打开一个场景
 * @param {*} file
 */
async function open(uuid) {
    // cc.view.resizeWithBrowserSize(true);
    // 查找资源，确认是否存在
    const info = await Manager.Ipc.send('query-asset-info', uuid);
    if (uuid && info) {
        // 加载指定的 uuid
        try {
            await promisify(cc.director._loadSceneByUuid)(uuid);
        } catch (error) {
            console.error(error);
        }
    } else {
        if (uuid && !info) {
            console.error(`scene ${uuid} is not exit`);
        }
        const scene = new cc.Scene();
        const canvas = new cc.Node('Canvas');
        canvas.parent = scene;
        canvas.addComponent(cc.Canvas);
        cc.director.runSceneImmediate(scene);
    }

    camera.setSize(cc.Canvas.instance._designResolution);
    camera.adjustToCenter(10);

    // 爬取节点树上的所有节点数据
    await manager.node.init(cc.director._scene);

    // 重置历史操作数据
    // const historyCache = require('./history/cache');
    // historyCache.reset();

    currentSceneData = serialize();

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:ready');
}

/**
 * 保存场景
 */
function serialize() {
    let asset = new cc.SceneAsset();
    asset.scene = cc.director._scene;
    cc.Object._deferredDestroy();
    return Manager.serialize(asset);
}

/**
 * 关闭一个场景
 */
function close() {
    return new Promise((resolve) => {
        setTimeout(() => {
            currentSceneData = null;
            // 发送节点修改消息
            Manager.Ipc.send('broadcast', 'scene:close');
            resolve();
        }, 300);
    });
}

/**
 * 查询节点数的信息
 * @param {*} uuid
 */
function queryNodeTree(uuid) {
    /**
     * 逐步打包数据
     * @param node
     */
    const step = (node) => {
        if (node._objFlags & cc.Object.Flags.HideInHierarchy) {
            return null;
        }

        const children = node._children.map(step).filter(Boolean);

        return {
            name: node.name,
            type: node.constructor.name.replace('_', '.'),
            uuid: node._id,
            children: children.length ? children : null,
        };
    };

    if (uuid) {
        const node = manager.node.query(uuid);
        if (!node) {
            return null;
        }
        return step(node);
    }

    if (!cc.director._scene) {
        return null;
    }

    return step(cc.director._scene);
}

/**
 * 查询一个节点相对于场景的搜索路径
 * @param {*} uuid
 */
function queryNodePath(uuid) {
    let node = manager.node.query(uuid);
    if (!node) {
        return '';
    }
    let names = [node.name];
    node = node.parent;
    while (node) {
        if (!node) {
            break;
        }
        names.splice(0, 0, node.name);
        node = node.parent;
    }
    return names.join('/');
}

/**
 * 查询当前场景是否修改
 */
function queryDirty() {
    if (!currentSceneData) {
        return false;
    }

    if (serialize() !== currentSceneData) {
        return false;
    }

    return true;
}

module.exports = {
    // 打开场景
    open,
    // 关闭当前场景（空实现）
    close,
    // 获取当前场景的序列化数据
    serialize,
    // 查询当前场景内的节点树信息
    queryNodeTree,
    // 查询一个节点的搜索路径
    queryNodePath,
    // 查询当前场景是否修改
    queryDirty,
};
