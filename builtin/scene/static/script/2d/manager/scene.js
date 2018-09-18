'use strict';

const nodeUtils = require('../utils/node');
const dumpUtils = require('../utils/dump');

const ipc = require('../../ipc/webview');
const { promisify } = require('util');

let uuid2node = {};

/**
 * 打开一个场景
 * @param {*} file
 */
async function open(uuid) {
    cc.view.resizeWithBrowserSize(true);

    if (uuid) {
        // 加载指定的 uuid
        await promisify(cc.director._loadSceneByUuid)(uuid);
    } else {
        const scene = new cc.Scene();
        const canvas = new cc.Node('Canvas');
        canvas.parent = scene;
        canvas.addComponent(cc.Canvas);
        cc.director.runSceneImmediate(scene);
    }

    // 爬取节点树上的所有节点数据
    await nodeUtils.walk(uuid2node, cc.director._scene);

    ipc.send('broadcast', 'scene:ready');
}

/**
 * 保存场景
 */
async function serialize() {
    ipc.send('broadcast', 'scene:close');

    let asset = new cc.SceneAsset();
    asset.scene = cc.director._scene;
    cc.Object._deferredDestroy();
    return Manager.serialize(asset);
}

/**
 * 关闭一个场景
 */
function close() {

}

/**
 * 查询一个节点的实例
 * @param {*} uuid
 */
function query(uuid) {
    return uuid2node[uuid] || null;
}

/**
 * 查询节点的 dump 数据
 * @param {*} uuid
 */
function queryNode(uuid) {
    let node = query(uuid);
    if (!node) {
        return null;
    }
    return dumpUtils.dumpNode(node);
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
        return {
            name: node.name,
            uuid: node._id,
            children: node._children ? node._children.map(step) : null,
        };
    };

    if (uuid) {
        const node = query(uuid);
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
    let node = query(uuid);
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
 * 设置一个节点的属性
 * @param {*} uuid
 * @param {*} path
 * @param {*} key
 * @param {*} dump
 */
function setProperty(uuid, path, key, dump) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 因为 path 内的 comp 实际指向的是 _comp
    path = path.replace('comps.', '_comps.');

    // 找到指定的 data 数据
    const data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 恢复数据
    dumpUtils.restoreProperty(dump, data, key);
}

/**
 * 创建一个新节点
 * @param {*} uuid
 * @param {*} name
 * @param {*} data
 */
async function createNode(uuid, name = 'New Node', data) {
    if (!cc.director._scene) {
        return;
    }

    const parent = query(uuid);
    const node = new cc.Node();
    node.name = name;
    parent.addChild(node);

    // 爬取节点树上的所有节点数据
    await nodeUtils.walk(uuid2node, node);

    return node._id;
}

/**
 * 删除一个节点
 * @param {*} uuid
 */
function removeNode(uuid) {
    const node = query(uuid);
    const parent = node.parent;
    parent.removeChild(node);
}

module.exports = {
    get uuid2node() {
        return uuid2node;
    },

    open,
    serialize,
    close,

    query,

    queryNode,
    queryNodeTree,
    queryNodePath,

    setProperty,
    // insertArrayProperty,
    // moveArrayProperty,
    // removeArrayProperty,

    // createComponent,
    // removeComponent,

    createNode,
    removeNode,

};
