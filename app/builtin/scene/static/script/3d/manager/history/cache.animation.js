'use strict';

const animationManager = require('../animation');

let nodeUuid = ''; // 当前正在编辑的节点 uuid
let clipUuid = ''; // 当前正在编辑的动画 uuid
let clipDump = null; // 当前正在编辑的动画的 dump 数据
/**
 * 获取此时的动画数据
 * 由于是单节点单动画轨道，所以不需要各 id 参数
 */
function getData() {
    return {
        nodeUuid,
        clipUuid,
        clipDump,
    };
}

/**
 * 获取传入 uuid
 * @param {*} uuids
 */
function getNewData() {
    refresh();
    return getData();
}

/**
 * 刷新缓存
 */
function refresh() {
    if (nodeUuid && clipUuid) {
        clipDump = animationManager.queryClip(nodeUuid, clipUuid);
    } else {
        clipDump = null;
    }
}

function setNodeUuid(uuid) {
    nodeUuid = uuid;
}

function setClipUuid(uuid) {
    clipUuid = uuid;
    refresh();
}

/**
 * 重置记录
 */
function reset(nodeUuid, clipUuid) {
    nodeUuid && setNodeUuid(nodeUuid);
    setClipUuid(clipUuid || animationManager._curEditClipUuid);
}

async function restore(stepData) {
    await animationManager.restoreFromDump(stepData.nodeUuid, stepData.clipUuid, stepData.clipDump);
    refresh();
}

module.exports = {
    getData,
    getNewData,
    refresh,
    reset,
    restore,
};
