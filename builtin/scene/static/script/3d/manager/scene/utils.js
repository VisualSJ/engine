'use strict';

/**
 * 通过一个 uuid 加载对应的场景
 */
exports.loadSceneByUuid = async function loadSceneByUuid(uuid) {
    return new Promise((resolve, reject) => {
        let timer = null;
        cc.director._loadSceneByUuid(uuid, (error) => {
            clearTimeout(timer);
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
            let timer = null;
            cc.director.runSceneImmediate(scene, (error) => {
                clearTimeout(timer);
                resolve();
            });
            timer = setTimeout(() => {
                reject('Open scene timeout...');
            }, 3000);
        });
    });
};
