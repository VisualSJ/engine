'use strict';

const manager = {
    ipc: require('./ipc'),
    node: require('./node'),
};

let currentSceneUuid = '';
let currentSceneData = null;

/**
 * 通过一个 uuid 加载对应的场景
 */
async function loadSceneByUuid(uuid) {
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
}

/**
 * 从一个序列化后的 json 内加载场景
 * @param {*} json
 */
async function loadSceneByJson(json) {
    return new Promise((resolve, reject) => {

        cc.AssetLibrary.loadJson(json, (error, scene) => {
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
}

/**
 * 打开一个场景
 * @param {*} file
 */
async function open(uuid) {
    if (uuid === currentSceneUuid) {
        return;
    }

    if (currentSceneUuid) {
        await close();
    }

    currentSceneUuid = uuid;
    // cc.view.resizeWithBrowserSize(true);

    try {
        await manager.ipc.send('query-asset-info', uuid);
    } catch (error) {
        uuid = '';
    }

    if (uuid) {
        // 加载指定的 uuid
        try {
            await loadSceneByUuid(uuid);
            currentSceneData = serialize();
        } catch (error) {
            console.error('Open scene failed: ' + uuid);
            console.error(error);
            currentSceneData = null;
        }
    } else {
        const scene = new cc.Scene();
        const canvas = new cc.Node('Canvas');
        canvas.parent = scene;
        canvas.addComponent(cc.Canvas);
        cc.director.runSceneImmediate(scene);
    }

    // 爬取节点树上的所有节点数据
    await manager.node.init(cc.director._scene);

    // 重置历史操作数据
    // const historyCache = require('./history/cache');
    // historyCache.reset();

    if (currentSceneData) {
        // 发送节点修改消息
        Manager.Ipc.send('broadcast', 'scene:ready');
    }
}

/**
 * 保存场景
 */
function serialize() {
    let asset = new cc.SceneAsset();
    asset.scene = cc.director.getScene();
    cc.Object._deferredDestroy();
    return Manager.serialize(asset);
}

/**
 * 关闭一个场景
 */
async function close() {
    return new Promise((resolve) => {
        setTimeout(() => {
            currentSceneUuid = '';
            currentSceneData = null;
            // 发送节点修改消息
            Manager.Ipc.send('broadcast', 'scene:close');
            resolve();
        }, 300);
    });
}

/**
 * 刷新一个场景并且放弃所有修改
 */
async function reload() {
    let uuid = currentSceneUuid;
    await close();
    await open(uuid);
}

/**
 * 软刷新，备份当前场景的数据，并重启场景
 */
async function softReload() {
    const json = Manager.serialize(cc.director.getScene());

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:close');

    try {
        await loadSceneByJson(json);
    } catch (error) {
        console.error('Open scene failed: ' + uuid);
        console.error(error);
        currentSceneData = null;
    }

    if (currentSceneData) {
        // 发送节点修改消息
        Manager.Ipc.send('broadcast', 'scene:ready');
    }
}

/**
 * 查询节点数的信息
 * @param {*} uuid
 */
function queryNodeTree(uuid) {
    /**
     * 逐步打包数据
     * @param node
     */
    const step = (node) => {

        if (node._objFlags & cc.Object.Flags.HideInHierarchy) {
            return null;
        }

        const children = node._children.map(step).filter(Boolean);

        return {
            name: node.name,
            type: node.constructor.name.replace('_', '.'),
            uuid: node._id,
            children: children.length ? children : null,
        };
    };

    if (uuid) {
        const node = manager.node.query(uuid);
        if (!node) {
            return null;
        }
        return step(node);
    }

    if (!cc.director._scene) {
        return null;
    }

    return step(cc.director._scene);
}

/**
 * 查询一个节点相对于场景的搜索路径
 * @param {*} uuid
 */
function queryNodePath(uuid) {
    let node = manager.node.query(uuid);
    if (!node) {
        return '';
    }
    let names = [node.name];
    node = node.parent;
    while (node) {
        if (!node) {
            break;
        }
        names.splice(0, 0, node.name);
        node = node.parent;
    }
    return names.join('/');
}

/**
 * 查询当前运行的场景是否被修改
 */
function queryDirty() {
    if (!currentSceneData) {
        return false;
    }

    if (serialize() !== currentSceneData) {
        return false;
    }

    return true;
}

module.exports = {

    // 打开场景
    open,
    // 关闭当前场景（空实现）
    close,
    // 重新加载当前的场景
    reload,
    // 软刷新场景
    softReload,
    // 获取当前场景的序列化数据
    serialize,

    // 查询当前场景内的节点树信息
    queryNodeTree,

    // 查询一个节点的搜索路径
    queryNodePath,

    // 查询当前场景是否被修改
    queryDirty,
};
