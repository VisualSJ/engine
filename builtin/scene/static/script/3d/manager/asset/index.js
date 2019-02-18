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
    const effects = cc.EffectAsset.getAll();
    // get uuid from prototype chain
    Object.keys(effects).map((key) => {
        effects[key].uuid = effects[key]._uuid;
    });

    return effects;
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
        return {};
    }
    const data = material.encodeEffect(effect);

    // 将 asset 数据合并到 effect 内整理出的 data 内
    const tech = data[asset._techIdx];
    tech.forEach((pass, index) => {
        Object.keys(asset._defines[index] || {}).forEach((name) => {
            const item = pass.defines.find((t) => { return t.name === name; });
            if (!item) {
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
 * 将所有的数据应用到 uuid 指向的 material 上
 * @param {*} uuid
 * @param {*} data
 */
async function applyMaterial(uuid, data) {
    const mtl = await material.decodeMaterial(data);
    await Manager.Ipc.send('save-asset', uuid, mtl);
}

function assetChange(uuid) {
    assetLibrary.onAssetChanged(uuid);
}

function assetDelete(uuid) {
    assetLibrary.onAssetRemoved(uuid);
}

function onSceneLoaded() {
    // iterate all component
    nodeMgr.queryUuids().forEach((uuid) => {
        const node = nodeMgr.query(uuid);

        node._components.forEach((component) => {
            assetWatcher.start(component);
        });
    });
}

sceneMgr.on('open', (error, scene) => {
    onSceneLoaded();
});

compMgr.on('component-added', (comp) => {
    assetWatcher.start(comp);
});

compMgr.on('before-component-remove', (comp) => {
    assetWatcher.stop(comp);
});

// 可能会和component事件重复了，但是undo里目前只有这个消息
nodeMgr.on('changed', (node) => {
    node._components.forEach((component) => {
        assetWatcher.start(component);
    });
});

module.exports = {
    queryAllEffects,
    queryEffect,
    queryMaterial,
    applyMaterial,
    assetChange,
    assetDelete,
};
