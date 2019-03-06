'use strict';

const nodeManager = require('../node');
let dumpMap = {}; // key 为 uuid, value 为 dumpdata 的平级节点树

/**
 * uuids 是所有节点的 uuid 数组
 */
nodeManager.on('inited', (uuids) => {
    reset(uuids);
});

/**
 * 获取传入 uuid 获取节点上一步记录的 dump 数据
 * @param {*} uuids
 */
function getNodes(uuids) {
    const result = {};
    uuids.forEach((uuid) => {
        result[uuid] = dumpMap[uuid];
    });
    return result;
}

/**
 * 获取传入 uuid 获取节点最新的与场景一致的数据
 * @param {*} uuids
 */
function getNewNodes(uuids) {
    refresh(uuids);
    return getNodes(uuids);
}

/**
 * 刷新缓存的节点树
 * @param {*} uuids 数组
 */
function refresh(uuids) {
    uuids.forEach((id) => {
        dumpMap[id] = nodeManager.queryDump(id);
    });
}

/**
 * 重置节点树
 * 这个触发的时机在 scene ready, 通过 history reset 的时序触发
 * 也在操作记录有截点重置的时候触发
 */
function reset(uuids) {
    dumpMap = {};
    uuids.forEach((uuid) => {
        dumpMap[uuid] = nodeManager.queryDump(uuid);
    });
}

module.exports = {
    getNodes,
    getNewNodes,
    refresh,
    reset,
};
