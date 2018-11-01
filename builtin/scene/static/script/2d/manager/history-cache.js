'use strict';

const scene = require('./scene');

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
    uuids.forEach((id) => {
        dumpMap[id] = scene.queryNode(id);
    });

    return getNodes(uuids);
}

/**
 * 重置节点树
 * 这个触发的时机在 scene ready, 通过 history reset 的时序触发
 * 也在操作记录有截点重置的时候触发
 */
function reset() {
    dumpMap = {};

    const uuids = Object.keys(scene.uuid2node);
    uuids.forEach((uuid) => {
        dumpMap[uuid] = scene.queryNode(uuid);
    });
}

module.exports = {
    getNodes,
    refresh,
    reset,
};
