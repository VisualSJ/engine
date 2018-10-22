'use strict';

const dumpnodes = require('./dumpnodes');
const scene = require('./scene');
const dump = require('../utils/dump');

let index = -1; // 当前指针
let method = ''; // 'redo' | 'undo' 已执行过的方法
const steps = []; // 记录的步骤数据, step 为 { undo: oldDumpdatas, redo: newDumpdatas }
let timeId; // 避免连续操作带来的全部执行，
let isRunning = false;
let stepData = {}; // 最后需要变动的步骤数据，多次撤销的时候数据会先进行合并，格式为 { uuid1: {}, uuid2: {} }
const records = []; // 格式为 uuid[]

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
        return false;
    }

    const oldData = dumpnodes.getNodes(records); // 取得旧数据
    const newData = dumpnodes.refresh(records); // 刷新 dumptree, 取得新数据

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
    method = '';
}

/**
 * 撤销
 */
function undo() {
    if (index === steps.length - 1) {
        snapshot();
    }

    if (index < 0) {
        return;
    }

    if (method === 'undo') {
        index--;
    } else {
        method = 'undo'
    }

    const state = restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            restore();
        }, 500);
    }
}

/**
 * 重做
 */
function redo() {
    if (index === steps.length - 1) {
        return;
    }
    index++;

    const state = restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(() => {
            restore();
        }, 500);
    }
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
        const node = scene.query(uuid);
        if (node) {
            dump.restoreNode(node, stepData[uuid]);
        }
    }

    // 保障一次运行
    setTimeout(() => {
        isRunning = false;
        stepData = {};
    }, 500); // 要比上面 undo, redo 的 setTimeout 时间短，以确保最后一次指令能执行
}

/**
 * 清空操作记录，重置参数
 */
function reset() {
    index = -1;
    method = '';
    steps.length = 0;
    clearTimeout(timeId);
    stepData = {};
    records.length = 0;

    dumpnodes.reset();
}

module.exports = {
    reset,
    record,
    snapshot,
    undo,
    redo
}