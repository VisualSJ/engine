'use strict';

const nodeManager = require('../node');
const dumpUtils = require('../../utils/dump');

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
 * 获取传入 uuid 获取节点最新的与场景一致的数据
 * @param {*} uuids
 */
function getNewData(uuids) {
    refresh(uuids);
    return getData(uuids);
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
    dumpMap = Object.create(null);
    uuids.forEach((uuid) => {
        dumpMap[uuid] = nodeManager.queryDump(uuid);
    });
}

async function restore(stepData) {
    // 数据 stepData 是 {} , key 为 uuid ，有多个，value 为改 uuid 节点的引擎属性值
    const uuids = Object.keys(stepData);

    // 先区分下要发什么样的变动事件
    const nodesEvent = {};

    const currentData = getData(uuids);
    for (const uuid of uuids) {
        const current = currentData[uuid];
        const future = stepData[uuid];

        if (!future) {
            nodesEvent[uuid] = 'remove';
            continue;
        }

        if (current.isScene) {
            nodesEvent[uuid] = 'change';
            continue;
        }

        let type = 'change';
        const currentParent = current.parent.value.uuid;
        const futureParent = future.parent.value.uuid;

        if (currentParent === '' && futureParent !== '') {
            type = 'add';
        }
        if (currentParent !== '' && futureParent === '') {
            type = 'remove';
        }

        nodesEvent[uuid] = type;
    }

    for (const uuid of uuids) {
        const node = nodeManager.query(uuid);
        if (node && nodesEvent[uuid] === 'change') { // remove 和 adde 节点，由父级节点的 children 变动实现，所以这边可以不操作
            await dumpUtils.restoreNode(node, stepData[uuid]); // 还原变动的节点
        }
    }

    // 广播事件
    for (const uuid of uuids) {
        const node = nodeManager.query(uuid);
        const event = nodesEvent[uuid];

        if (node) {
            Manager.Ipc.forceSend('broadcast', `scene:${event}-node`, uuid);
            nodeManager.emit(event, node, false);
        }
    }

    refresh(uuids);
}

module.exports = {
    getData,
    getNewData,
    refresh,
    reset,
    restore,
};
