'use strict';

const scene = require('./scene');

let dumpTree = {}; // key 为 uuid, value 为 dumpdata 的平级节点树

function getNodes(uuids) {
    const rt = {};
    uuids.forEach(id => {
        rt[id] = dumpTree[id];
    });

    return rt;
}

/**
 * 刷新节点树，同时返回刷新的数据
 * @param {*} uuids 
 */
function refresh(uuids) {
    uuids.forEach(id => {
        dumpTree[id] = scene.queryNode(id);
    });

    return getNodes(uuids);
}

/**
 * 重置节点树
 * 这个触发的时机在 scene open, 通过 history reset 的时序触发
 */
function reset() {
    dumpTree = {}
    for (let uuid in scene.uuid2node) {
        dumpTree[uuid] = scene.queryNode(uuid);
    }
}


module.exports = {
    getNodes,
    refresh,
    reset,
}