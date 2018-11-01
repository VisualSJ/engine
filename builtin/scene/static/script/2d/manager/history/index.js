'use strict';

const manager = {
    node: require('../node'),
};
const historyCache = require('./cache');
const dump = require('../../utils/dump');
const ipc = require('../../../ipc/webview');

const steps = []; // 记录的步骤数据, step 为 { undo: oldDumpdatas, redo: newDumpdatas }
const records = []; // 格式为 uuid[]

let index = -1; // 当前指针
let method = 'redo'; // 'redo' | 'undo' 已执行过的方法
let timeId; // 避免连续操作带来的全部执行，
let isRunning = false;
let stepData = {}; // 最后需要变动的步骤数据，多次撤销的时候数据会先进行合并，格式为 { uuid1: {}, uuid2: {} }

/**
 * 记录受 ipc 修改指令影响的 uuid
 */
function record(uuid) {
    records.push(uuid);
}

/**
 *
 */
function recordSave() {
    if (records.length === 0) {
        if (index !== steps.length - 1) {
            historyCache.reset();
        }
        return false;
    }

    const oldData = historyCache.getNodes(records); // 取得旧数据
    const newData = historyCache.refresh(records); // 刷新 dumptree, 取得新数据

    records.length = 0;

    return {
        undo: oldData,
        redo: newData,
    };
}

function snapshot() {
    const step = recordSave();
    //
    if (step === false) {
        return;
    }

    // 清除指针后面的数据
    const deprecated = steps.splice(index + 1);
    // TODO 内存优化可用从 deprecated 里面包含的对象处理

    // 存入新步骤
    steps.push(step);

    // 如果步骤数大于 100, 始终保持最大 100
    if (steps.length > 100) {
        const deprecated2 = steps.shift();
        // TODO 内存优化可用从 deprecated 里面包含的对象处理
    }

    // 重设指针和方法
    index = steps.length - 1;
    method = 'redo';
}

/**
 * 撤销
 */
function undo() {
    if (records.length !== 0) {
        snapshot();
    }

    if (method === 'undo') {
        if (index === 0) {
            return;
        }

        index--;
    } else {
        if (index < 0) {
            return;
        }
        method = 'undo';
    }

    const state = restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            restore();
        }, 500);
    }
    return state;
}

/**
 * 重做
 */
function redo() {
    if (records.length !== 0) {
        snapshot();
    }

    if (method === 'redo') {
        if (index === steps.length - 1) {
            return;
        }

        index++;
    } else {
        method = 'redo';
    }

    const state = restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            restore();
        }, 500);
    }
    return state;
}

/**
 * 场景刷新
 */
function restore() {
    const dumpdata = steps[index][method];
    Object.assign(stepData, dumpdata);

    if (isRunning) {
        return false;
    }

    isRunning = true;

    // 数据 stepData 是 {} , key 为 uuid ，有多个，value 为改 uuid 节点的引擎属性值
    for (const uuid in stepData) {

        if (!(uuid in stepData)) {
            continue;
        }

        const node = manager.node.query(uuid);
        if (node) {
            // 还原节点
            dump.restoreNode(node, stepData[uuid]);
            // 广播已变动的节点
            ipc.send('broadcast', 'scene:node-changed', uuid);
        }
    }

    isRunning = false;
    stepData = {};

    return true;
}

/**
 * 清空操作记录，重置参数
 */
function reset() {
    index = -1;
    method = 'redo';
    steps.length = 0;
    clearTimeout(timeId);
    stepData = {};
    records.length = 0;

    historyCache.reset();
}

module.exports = {
    reset,
    record,
    snapshot,
    undo,
    redo
};
