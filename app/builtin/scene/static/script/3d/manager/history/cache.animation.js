'use strict';

const animationManager = require('../animation');

let dumpMap = {}; // key 为 uuid, value 为 dumpdata 的平级节点树

/**
 * 获取传入 uuid 获取节点上一步记录的 dump 数据
 * @param {*} uuids
 */
function getData(uuids) {
    const result = {};
    uuids.forEach((uuid) => {
        result[uuid] = dumpMap[uuid];
    });
    return result;
}

/**
 * 获取传入 uuid
 * @param {*} uuids
 */
function getNewData(uuids) {
    refresh(uuids);
    return getData(uuids);
}

/**
 * 刷新缓存
 * @param {*} uuids 数组
 */
function refresh(uuids) {
    uuids.forEach((id) => {
        // dumpMap[id] = animationManager.queryDump(id);
    });
}

/**
 * 重置
 */
function reset(uuids) {
    dumpMap = Object.create(null);
    uuids.forEach((uuid) => {
        dumpMap[uuid] = animationManager.queryDump(uuid);
    });
}

module.exports = {
    getData,
    getNewData,
    refresh,
    reset,
};
