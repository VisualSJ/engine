'use stirct';

/**
 * 节点管理器
 * 负责管理当前打开场景的 uuid 与节点对应关系
 */

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

module.exports = {
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
};
