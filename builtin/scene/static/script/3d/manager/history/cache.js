'use strict';

let dumpMap = {}; // key 为 uuid, value 为 dumpdata 的平级节点树

/**
 * 获取传入 uuid 对应节点的 dump 缓存
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
 * 刷新节点树，同时返回刷新的数据
 * @param {*} uuids
 */
function refresh(uuids) {
    const managerScene = require('../node');

    uuids.forEach((id) => {
        dumpMap[id] = managerScene.queryDump(id);
    });

    return getNodes(uuids);
}

module.exports = {
    getNodes,
    refresh,
};
