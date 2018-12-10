'use strict';

const ipc = require('./ipc');
const uuidSet = new Set();

async function init() {
    const uuids = await ipc.send('query-effects');
    await Promise.all(uuids.map((uuid) => {
        return registerEffect(uuid);
    }));
}

/**
 * 传入一个 effect uuid 数组，将这些 effect 注册到管理器内
 * @param {*} uuids
 */
function registerEffects(uuids) {
    uuids.forEach(registerEffect);
}

/**
 * 注册一个 effect
 * @param {*} uuid
 */
function registerEffect(uuid) {
    return new Promise((resolve, reject) => {
        cc.AssetLibrary.loadAsset(uuid, (err, asset) => {
            if (err) {
                console.error(err);
                return reject(err);
            }
            if (cc.EffectAsset && cc.EffectAsset.register) {
                uuidSet.add(uuid);
                cc.EffectAsset.register(asset);
                ipc.send('broadcast', 'scene:effect-update', uuid);

                return resolve();
            }
            console.warn(`cannot call method cc.EffectAsset.register`);
            resolve();
        });
    });
}

/**
 * 将一个已经注册的 effect 移除
 */
function removeEffect(uuid) {
    if (!uuidSet.has(uuid)) {
        return;
    }
    if (cc.EffectAsset && cc.EffectAsset.remove) {
        uuidSet.delete(uuid);
        cc.EffectAsset.remove(uuid);
        ipc.send('broadcast', 'scene:effect-update', uuid);
        return true;
    }
    console.warn(`cannot call method cc.EffectAsset.remove`);
}

/**
 * 移除一个 uuids 列表
 * @param {*} uuids
 */
function removeEffects(uuids) {
    uuids.map(removeEffect);
}

module.exports = {
    init,
    registerEffects,
    registerEffect,
    removeEffect,
    removeEffects,
};
