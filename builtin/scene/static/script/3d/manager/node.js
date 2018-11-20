'use stirct';

/**
 * 节点管理器
 * 负责管理当前打开场景的 uuid 与节点对应关系
 */

const { get, } = require('lodash');
const dumpUtils = require('../utils/dump');
const getComponentFunctionOfNode = require('../utils/get-component-function-of-node');

const Reg_Uuid = /^[0-9a-fA-F-]{36}$/;
const Reg_NormalizedUuid = /^[0-9a-fA-F]{32}$/;
const Reg_CompressedUuid = /^[0-9a-zA-Z+/]{22,23}$/;

/////////////////////////
// 节点管理功能

let uuid2node = {};

/**
 * 传入一个场景，将内部的节点全部缓存
 * @param {*} scene
 */
function init(scene) {
    scene && walk(scene);
}

/**
 * 清空当前管理的节点
 */
function clear() {
    uuid2node = {};
}

/**
 * 添加一个节点到管理器内
 * @param {*} node
 */
function add(node) {
    uuid2node[node._id] = node;
}

/**
 * 从管理起内移除一个指定的节点
 * @param {*} node
 */
function remove(node) {
    delete uuid2node[node._id];
}

/**
 * 查询一个节点的实例
 * @param {*} uuid
 * @return {cc.Node}
 */
function query(uuid) {
    return uuid2node[uuid] || null;
}

/**
 * 查询受管理的所有节点的 uuid 数组
 */
function queryUuids() {
    return Object.keys(uuid2node);
}

/**
 * 查询一个节点，并返回该节点的 dump 数据
 *   如果节点不存在，则返回 null
 * @param {String} uuid
 */
function queryDump(uuid) {
    let node = query(uuid);
    if (!node) {
        return null;
    }
    return dumpUtils.dumpNode(node);
}

/**
 * 设置一个节点的属性
 * @param {*} uuid
 * @param {*} path
 * @param {*} key
 * @param {*} dump
 */
function setProperty(uuid, path, dump) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 恢复数据
    dumpUtils.restoreProperty(node, path, dump);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    if (path === 'parent') {
        // 发送节点修改消息
        Manager.Ipc.send('broadcast', 'scene:node-changed', parent.uuid);
    }
    return true;
}

/**
 * 调整一个数组类型的数据内某个 item 的位置
 * @param uuid 节点的 uuid
 * @param path 数组的搜索路径
 * @param target 目标 item 原来的索引
 * @param offset 偏移量
 */
function moveArrayElement(uuid, path, target, offset) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 __comps__ 实际指向的是 _components
    path = path.replace('__comps__', '_components');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 移动顺序
    if (path === 'children') {
        const child = data[target];
        child.setSiblingIndex(target + offset);
    } else {
        const temp = data.splice(target, 1);
        data.splice(target + offset, 0, temp[0]);
    }

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    return true;
}

/**
 * 删除一个数组元素
 * @param uuid 节点的 uuid
 * @param path 元素所在数组的搜索路径
 * @param index 目标 item 原来的索引
 */
function removeArrayElement(uuid, path, index) {
    const node = query(uuid);
    const key = (path || '').split('.').pop();

    if (key === 'children') {
        console.warn('Unable to change `children` of the parent, Please change the `parent` of the child');
        return false;
    }

    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 __comps__ 实际指向的是 _components
    path = path.replace('__comps__', '_components');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 删除某个 item
    const temp = data.splice(index, 1);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    return true;
}

/**
 * 创建一个组件并挂载到指定的 entity 上
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function createComponent(uuid, component) {
    const node = query(uuid);
    if (!node) {
        console.warn(`create component failed: ${uuid} does not exist`);
        return false;
    }

    if (Reg_Uuid.test(component) || Reg_NormalizedUuid.test(component) || Reg_CompressedUuid.test(component)) {
        component = cc.js._getClassById(component);
    }

    node.addComponent(component);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);
}

/**
 * 移除一个 entity 上的指定组件
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function removeComponent(uuid, component) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    node.removeComponent(component);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);
}

/**
 * 创建一个新节点
 * @param {*} uuid
 * @param {*} name
 * @param {*} data
 */
async function createNode(uuid, name = 'New Node', dump) {
    if (!cc.director._scene) {
        return;
    }

    const parent = query(uuid);
    const node = new cc.Node();

    if (dump) {
        const dumpData = queryNode(dump);
        // 这几个属性不需要赋给一个新节点
        delete dumpData.uuid;
        delete dumpData.parent;
        delete dumpData.children;

        dumpUtils.restoreNode(node, dumpData);
    }

    if (name) {
        node.name = name;
    }

    parent.addChild(node);

    // 爬取节点树上的所有节点数据
    await add(node);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-created', node.uuid);
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    return node.uuid;
    // return {
    //     uuid: node.uuid,
    //     parentUuid: node._parent.uuid,
    // };
}

/**
 * 删除一个节点
 * @param {*} uuid
 */
function removeNode(uuid) {
    const node = query(uuid);
    const parent = node.parent;
    parent.removeChild(node);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', parent.uuid);
    Manager.Ipc.send('broadcast', 'scene:node-removed', node.uuid);

    return parent.uuid;
}

/**
 * 查询节点上所有组件上可运行的方法名
 * @param {*} uuid
 */
function queryComponentFunctionOfNode(uuid) {
    const node = query(uuid);

    if (!node) {
        return {};
    }
    return getComponentFunctionOfNode(node);
}

/////////////////////////
// 工具函数

/**
 * 爬取节点上的数据
 * @param children
 */
function walkChild(node) {
    uuid2node[node._id] = node;
    node.children && node.children.forEach((child) => {
        walkChild(child);
    });
}

/**
 * 爬取 engine 内打开的场景的节点数据
 * @param {*} scene
 */
function walk(scene) {
    walkChild(scene);
}

let Utils = {
    // 从一个场景初始化所有被管理的节点
    init,
    // 清空所有管理的节点
    clear,
    // 添加一个节点到管理器
    add,
    // 从管理器内移除一个指定的节点
    remove,
    // 查询一个节点的实例
    query,
    // 查询受管理的所有节点的 uuid 数组
    queryUuids,

    // 查询一个节点的 dump 数据
    queryDump,

    // 设置一个节点上某个属性的数据
    setProperty,
    // // 插入一个数组类型的属性项
    // insertArrayElement,
    // 移动一个数组类型的属性项
    moveArrayElement,
    // 删除一个数组类型的属性项
    removeArrayElement,

    // 创建一个组件并挂到指定的节点上
    createComponent,
    // 移除一个节点上的指定组件
    removeComponent,

    // 创建节点
    createNode,
    // 移除节点
    removeNode,

    // 查询节点上所有组件上可运行的方法名
    queryComponentFunctionOfNode,
};

module.exports = Utils;
