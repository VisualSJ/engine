'use stirct';

const material = require('./material');
require('../../../../../dist/utils/asset/asset-library-extends');
const sceneMgr = require('../scene');
const nodeMgr = require('../node');
const compMgr = require('../component');
const assetWatcher = require('../../../../../dist/utils/asset/asset-watcher');

const assetLibrary = cc.AssetLibrary;

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
function queryEffectDataForInspector(effectName) {
    const effect = cc.EffectAsset.get(effectName);
    if (!effect) {
        return {};
    }
    return material.encodeEffect(effect);
}

/**
 * 返回创建的 material 序列化数据
 *
 * todo 需要容错处理
 * @param {{effectName: string, _props: {}, _defines: {}}} options
 * @returns {string}
 */
function querySerializedMaterial(mtl) {
    return material.decodeMaterial(mtl);
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
    queryEffectDataForInspector,
    querySerializedMaterial,
    assetChange,
    assetDelete,
};
