'use strict';

const nodeManager = require('../node');
const sceneManager = require('../scene');
const animationManager = require('../animation');
const cacheScene = require('./cache.scene');
const cacheAnimation = require('./cache.animation');

let cache = cacheScene; // 默认接入场景节点的数据

// 底部 startBrandNewRecord() 会重置这三个参数
let steps = null; // 记录的步骤数据, step 为 { undo: oldDumpdatas, redo: newDumpdatas }
let index = null; // 当前指针
let method = null; // 'redo' | 'undo' 已执行过的方法

let records = []; // 格式为 [uuid]
let timeId; // 避免连续操作带来的全部执行，
let isRunning = false;
let stepData = {}; // 最后需要变动的步骤数据，多次撤销的时候数据会先进行合并，格式为 { uuid1: {}, uuid2: {} }

const prefabType = Symbol('prefab-scene');
const mainType = Symbol('main-scene');

let currentScene = { // 当前的场景, 包括编辑 prefab 时的临时场景
    uuid: '',
    type: '', // 场景类型 prefabType 或 mainType
};

let mainScene = { // 缓存主场景的历史记录
    uuid: '',
    steps: null,
    index: 0,
    method: '',
};

let prefabScene = { // 缓存编辑 prefab 下场景的历史记录
    steps: null,
    index: 0,
    method: '',
};

// 场景模式下 prefab 和 main scene 的切换
sceneManager.on('before-minor', () => {
    snapshot();
});

// 场景启动完毕后的事件
nodeManager.on('inited', (uuids, scene) => { // uuids 是当前场景所有节点的数组
    reset(uuids, scene);
});

nodeManager.on('change', (node, enable = true) => { // enable 是内部 undo redo 产生的变化，不参与记录
    enable && record(node.uuid);
    Manager.Ipc.send('change-title', false);
});

nodeManager.on('add', (node, enable = true) => {
    enable && loopRecord(node);
    Manager.Ipc.send('change-title', false);
});

nodeManager.on('remove', (node, enable = true) => {
    enable && record(node.uuid);
    Manager.Ipc.send('change-title', false);
});

// 启动动画模式
sceneManager.on('animation-start', (nodeUuid) => {
    startAnimationRecord(nodeUuid);
});

sceneManager.on('animation-end', () => {
    endAnimationRecord();
});

// 动画编辑的事件
animationManager.on('scene:animation-change', (nodeUuid, clipUuid) => {
    // records.push(clipUuid);
});

// animationManager.on('clip-change', (nodeUuid, clipUuid) => {
//     cache.reset(nodeUuid, clipUuid);
// });

// 新增的是一个复合节点，就需要其子节点也一起记录，例如 prefab
function loopRecord(node) {
    record(node.uuid);

    if (Array.isArray(node.children)) {
        node.children.forEach((child) => {
            loopRecord(child);
        });
    }
}

/**
 * 记录受 ipc 修改指令影响的 uuid
 */
function record(uuid) {
    if (!records.includes(uuid)) {
        records.push(uuid);
    }
}

/**
 * 停止记录，并将已记录的数据存档
 */
function stopRecordToArchive() {
    if (records.length === 0) {
        return false;
    }

    const oldData = cache.getData(records); // 取得旧数据
    const newData = cache.getNewData(records); // 刷新 dumptree, 取得新数据

    records.length = 0;

    return {
        undo: oldData,
        redo: newData,
    };
}

function snapshot() {
    const step = stopRecordToArchive();

    if (step === false) {
        return;
    } else {
        // 过滤脏数据，来源于 gizmo 或其他面板中发送了 uuid change 的 ipc，但实际 uuid 节点并没有变化
        if (JSON.stringify(step.undo) === JSON.stringify(step.redo)) {
            return;
        }
    }

    const current = steps[index];

    // 如果是处于 undo 状态中的新增步骤，index 步骤数处于上一步的 undo 中，需要修正 -1
    if (current && method === 'undo') {
        index -= 1;
    }

    // 清除指针后面的数据
    const deprecated = steps.splice(index + 1);
    // TODO 内存优化可用从 deprecated 里面包含的对象处理，新的记录点已建立，已删除的节点不可能在 undo 复原，故可以删除；但需考虑编辑器和引擎的其他节点管理机制

    // 存入新步骤
    if (deprecated.length > 0) {
        /**
         * 当前 current 是旧数据，step 是新数据
         * 需要保留 current 数据, 但 redo 指向已变更
         * 所以 current.redo 和 step.undo 如果有相同的 uuid 记录，此 uuid 记录应该以 step 的为准
         */
        for (const uuid in current.redo) {
            if (step.undo[uuid]) {
                current.redo[uuid] = JSON.parse(JSON.stringify(step.undo[uuid]));
            }
        }
    }

    steps.push(step);

    // 如果步骤数大于 100, 始终保持最大 100
    if (steps.length > 100) {
        const deprecated2 = steps.shift();
        // TODO 内存优化可用从 deprecated2 里面包含的对象处理，不可能再 undo 复原的节点可以删除掉
    }

    // 重设指针和方法
    index = steps.length - 1;
    method = 'redo';
}

/**
 * 撤销
 */
async function undo() {
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
    const state = await restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(async () => {
            await restore();
        }, 500);
    }
    return state;
}

/**
 * 重做
 */
async function redo() {
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
    const state = await restore();

    // 运行中，定时下次运行
    if (state === false) {
        clearTimeout(timeId);
        timeId = setTimeout(async () => {
            await restore();
        }, 500);
    }
    return state;
}

/**
 * 场景刷新
 */
async function restore() {
    if (isRunning) {
        return false;
    }
    isRunning = true;

    const dumpdata = steps[index][method];
    Object.assign(stepData, dumpdata);

    await cache.restore(stepData);

    isRunning = false;
    stepData = {};

    return true;
}

/**
 * 清空操作记录，重置参数
 */
function reset(uuids, scene) {
    if (currentScene.uuid === scene.uuid) { // 就是当前的场景，此处容错是因为软刷新会多次触发 scene open 事件
        return;
    }
    currentScene.uuid = scene.uuid; // 缓存当前场景 uuid

    if (scene.name.includes('.prefab')) { // 重要：判断此场景是编辑 prefab
        startPrefabRecord();
    } else {
        startMainSceneRecord();
    }

    clearTimeout(timeId);
    stepData = {};
    records = [];

    cache.reset(uuids); // 缓存尚未变动的场景数据
}

/**
 * 开始动画编辑模式下的 undo 记录
 */
function startAnimationRecord(nodeUuid) {
    currentScene.editingAnimation = true;

    const scene = currentScene.tpye === prefabType ? prefabScene : mainScene;
    Object.assign(scene, { // 暂存当前场景的数据
        steps,
        index,
        method,
    });

    startBrandNewRecord();

    cache = cacheAnimation; // 开始接入动画数据

    cache.reset(nodeUuid); // 由于动画编辑不需要持久性，开启便需要重置数据
}

/**
 * 结束动画编辑模式
 */
function endAnimationRecord() {
    // 返回，接入场景数据，场景数据需要持久性，这里不需要再 cache.reset()
    cache = cacheScene;

    // 回退上次编辑模式下的操作数据
    const scene = currentScene.tpye === prefabType ? prefabScene : mainScene;
    steps = scene.steps;
    index = scene.index;
    method = scene.method;
}

function startPrefabRecord() {
    currentScene.tpye = prefabType;

    Object.assign(mainScene, { // 暂存当前主场景的数据
        steps,
        index,
        method,
    });

    startBrandNewRecord();
}

function startMainSceneRecord() {
    currentScene.tpye = mainType;

    if (mainScene.uuid === currentScene.uuid) {
        steps = mainScene.steps;
        index = mainScene.index;
        method = mainScene.method;
    } else {
        mainScene.uuid = currentScene.uuid; // 更新当前场景的标注
        startBrandNewRecord();
    }
}

function startBrandNewRecord() {
    steps = [];
    index = -1;
    method = 'redo';
}

module.exports = {
    reset,
    record,
    snapshot,
    undo,
    redo,
};
