'use stirct';

const util = require('util');
const material = require('./material');
require('../../../../../dist/utils/asset/asset-library-extends');
const sceneMgr = require('../scene');
const nodeMgr = require('../node');
const compMgr = require('../component');
const assetWatcher = require('../../../../../dist/utils/asset/asset-watcher');

const assetLibrary = cc.AssetLibrary;

const dumpEncode = require('../../../../../dist/utils/dump/encode');

/**
 * 返回包含所有 Effect 的对象
 * @returns {{}}
 */
function queryAllEffects() {
    try {
        const effects = cc.EffectAsset.getAll();
        // get uuid from prototype chain
        Object.keys(effects).map((key) => {
            effects[key].uuid = effects[key]._uuid;
        });
        return effects;
    } catch (error) {
        return [];
    }
}

/**
 * 根据 effectName 为 inspector 构建指定 Effect 数据
 * @param {string} effectName
 * @returns {{props: any[], defines: any[]}}
 */
function queryEffect(effectName) {
    const effect = cc.EffectAsset.get(effectName);
    if (!effect) {
        return {};
    }
    return material.encodeEffect(effect);
}

/**
 * 传入 material 的 uuid，返回具体的 material 数据
 * @param {*} uuid
 * @param {*} name
 */
async function queryMaterial(uuid) {
    let asset;
    try {
        asset = await util.promisify(cc.AssetLibrary.loadAsset)(uuid);
    } catch (error) {
        console.error(error);
    }

    if (!asset) {
        return null;
    }

    const effect = cc.EffectAsset.get(asset.effectName);
    if (!effect) {
        return {
            effect: '',
            technique: 0,
            data: [],
        };
    }
    const data = material.encodeEffect(effect);

    // 将 asset 数据合并到 effect 内整理出的 data 内
    const tech = data[asset._techIdx];
    tech.passes.forEach((pass, index) => {
        Object.keys(asset._defines[index] || {}).forEach((name) => {
            const item = pass.defines.find((t) => { return t.name === name; });
            if (!item) {
                // pass 的 switch 数据也是放在 define 内，所以这里需要判断数据是否要给 switch
                if (pass.switch.name === name) {
                    pass.switch.value = asset._defines[index][name];
                }
                return;
            }
            const dump = dumpEncode.encodeObject(asset._defines[index][name], {});
            if (dump.type !== 'Unknown') {
                item.dump.value = dump.value;
            }
        });
        Object.keys(asset._props[index] || {}).forEach((name) => {
            const item = pass.props.find((t) => { return t.name === name; });
            if (!item) {
                return;
            }
            const dump = dumpEncode.encodeObject(asset._props[index][name], {});
            if (dump.type !== 'Unknown') {
                item.dump.value = dump.value;
            }
        });
    });

    return {
        effect: asset.effectName,
        technique: asset._techIdx,
        data,
    };
}

/**
 * 传入一个发出的 material 数据以及对应的 uuid
 * 将所有的数据应用到 uuid 对应的的 material 资源上
 * @param {*} uuid
 * @param {*} data
 */
async function applyMaterial(uuid, data) {
    const mtl = await material.decodeMaterial(data);
    await Manager.Ipc.send('save-asset', uuid, mtl);
}

const _previewLocker = {};
/**
 * 传入一个发出的 material 数据以及对应的 uuid
 * 将所有的数据应用到 uuid 对应的 material 运行时数据上
 * @param {*} uuid
 * @param {*} data
 */
async function previewMaterial(uuid, data) {
    // 如果之前正在更新这个 material，则放到缓存内
    if (_previewLocker[uuid] !== undefined) {
        _previewLocker[uuid] = { uuid, data };
        return;
    }

    // 记录当前正在更新这个 material
    _previewLocker[uuid] = null;
    try {
        if (data) {
            const mtl = await material.decodeMaterial(data);
            const asset = await util.promisify(cc.AssetLibrary.loadJson)(mtl);
            asset._uuid = uuid;
            cc.AssetLibrary.assetListener.invoke(uuid, asset);
        } else {
            const asset = await util.promisify(cc.AssetLibrary.loadAsset)(uuid);
            cc.AssetLibrary.assetListener.invoke(uuid, asset);
        }
    } catch (error) {
        console.error(error);
    }

    // 更新结束后，查看是否中途有更新请求，如果有的话
    if (_previewLocker[uuid] !== null) {
        const info = _previewLocker[uuid];
        process.nextTick(previewMaterial(info.uuid, info.data));
    }
    delete _previewLocker[uuid];
}

function assetChange(uuid) {
    assetLibrary.onAssetChanged(uuid);
}

function assetDelete(uuid) {
    assetLibrary.onAssetRemoved(uuid);
}

function onSceneLoaded() {
    assetLibrary.assetListener.clear();
    // iterate all component
    nodeMgr.queryUuids().forEach((uuid) => {
        const node = nodeMgr.query(uuid);

        node._components.forEach((component) => {
            assetWatcher.start(component);
        });
    });
}

sceneMgr.on('open', (scene) => {
    onSceneLoaded();
});

compMgr.on('add-component', (comp) => {
    assetWatcher.start(comp);
});

compMgr.on('before-remove-component', (comp) => {
    assetWatcher.stop(comp);
});

// 可能会和component事件重复了，但是undo里目前只有这个消息
nodeMgr.on('change', (node) => {
    node._components.forEach((component) => {
        assetWatcher.start(component);
    });
});

const gizmoManager = require('./../gizmos');
const nodeManger = require('./../node');
const selection = require('./../selection');

// 存储支持拖拽的资源类型
const supportTypes = ['cc.Material', 'cc.Prefab', 'cc.Mesh'];
let lastHilightNode;

function canDrop(type) {
    return supportTypes.includes(type);
}

function onDragOver(event) {
    if (!canDrop(event.type)) {
        return;
    }
    const {resultNode} = selection.getResultNode(event.x, event.y);
    if (!resultNode || lastHilightNode === resultNode) {
        return;
    }
    if (event.type === 'cc.Material') {
        const result = resultNode._components.find((comp) => {
            return comp.__classname__ === 'cc.ModelComponent';
        });
        if (!result) {
            return;
        }
        gizmoManager.clearAllGizmos();
        // 高亮显示节点
        lastHilightNode = resultNode;
        gizmoManager.showNodeGizmoOfNode(resultNode);
    }
}

async function onDrop(event) {
    if (!canDrop(event.type)) {
        return;
    }
    gizmoManager.clearAllGizmos();
    const {resultNode, ray} = selection.getResultNode(event.x, event.y);
    // 放置的位置有节点
    if (resultNode) {
        const dump = {
            type: event.type,
            value: '',
        };
        switch (event.type) { // 对拖拽资源的处理
            case 'cc.Material':
                const index = resultNode._components.findIndex((comp) => {
                    return comp.__classname__ === 'cc.ModelComponent';
                });
                const path = `__comps__.${index}.sharedMaterials.0`; // 默认修改模型材质数组里的第一个材质
                dump.value = {uuid: event.uuid};
                nodeManger.setProperty(resultNode.uuid, path, dump);
                return;
        }
    }

    // 可以直接生成节点的类型
    if (nodeManger.supportTypes.includes(event.type)) {
        // 计算射线与平面的交点
        const plane = cc.geometry.plane.create(0, 1, 0, 0);
        const result = cc.geometry.intersect.ray_plane(ray, plane);
        const position = new cc.Vec3(0, 0, 0);
        cc.vmath.vec3.scaleAndAdd(position, ray.o, ray.d, result);
        const uuid = await nodeManger.createNodeFromAsset(null, event.uuid, {
            position,
            type: event.type,
        });
        const node = nodeManger.query(uuid);
        gizmoManager.showNodeGizmoOfNode(node);
    }
    lastHilightNode = null;
}

module.exports = {
    queryAllEffects,
    queryEffect,
    queryMaterial,
    applyMaterial,
    previewMaterial,
    assetChange,
    assetDelete,
    onDragOver,
    onDrop,
};
