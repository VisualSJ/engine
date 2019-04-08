'use strict';

/**
 * 通过一个 uuid 加载对应的场景
 */
exports.loadSceneByUuid = async function loadSceneByUuid(uuid) {
    return new Promise((resolve, reject) => {
        let timer = null;
        cc.director._loadSceneByUuid(uuid, (error) => {
            clearTimeout(timer);
            if (error) {
                return reject(error);
            }
            resolve();
        });
        timer = setTimeout(() => {
            reject('Open scene timeout...');
        }, 3000);
    });
};

/**
 * 从一个场景节点加载场景
 */
exports.loadSceneByNode = async function loadSceneByNode(scene) {
    return new Promise((resolve, reject) => {
        let timer = null;
        cc.director.runSceneImmediate(scene, (error) => {
            clearTimeout(timer);
            if (error) {
                return reject(error);
            }
            resolve();
        });
        timer = setTimeout(() => {
            reject('Open scene timeout...');
        }, 3000);
    });
};

/**
 * 从一个序列化后的 json 内加载场景
 */
exports.loadSceneByJson = async function loadSceneByJson(json) {
    return new Promise((resolve, reject) => {

        cc.AssetLibrary.loadJson(json, (error, scene) => {
            if (scene instanceof cc.SceneAsset) {
                scene = scene.scene;
            }

            let timer = null;
            cc.director.runSceneImmediate(scene, (error) => {
                clearTimeout(timer);
                if (error) {
                    return reject(error);
                }
                resolve();
            });
            timer = setTimeout(() => {
                reject('Open scene timeout...');
            }, 3000);
        });
    });
};

/**
 * 加载一个 prefab 成为场景
 */
exports.loadPrefab = async function(uuid) {
    return new Promise((resolve, reject) => {
        cc.AssetLibrary.loadAsset(uuid, (error, prefab) => {
            if (error) {
                return reject(error);
            }

            if (!(prefab instanceof cc.Prefab)) {
                return reject('Open resources are not prefabricated! - ' + uuid);
            }

            resolve(prefab);
        });
    });
};
