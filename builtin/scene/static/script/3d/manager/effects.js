const uuidSet = new Set();

function registerEffects(uuids) {
    uuids.map(registerEffect);
}

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
                Manager.Ipc.send('broadcast', 'scene:effect-update', uuid);

                return resolve();
            }
            console.warn(`cannot call method cc.EffectAsset.register`);
            resolve();
        });
    });
}

function removeEffect(uuid) {
    if (!uuidSet.has(uuid)) {
        return;
    }
    if (cc.EffectAsset && cc.EffectAsset.remove) {
        uuidSet.delete(uuid);
        cc.EffectAsset.remove(uuid);
        Manager.Ipc.send('broadcast', 'scene:effect-update', uuid);
        return true;
    }
    console.warn(`cannot call method cc.EffectAsset.remove`);
}

function removeEffects(uuids) {
    uuids.map(removeEffect);
}

module.exports = {
    registerEffects,
    registerEffect,
    removeEffect,
    removeEffects,
};
