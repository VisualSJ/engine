'use stirct';

/**
 * 节点管理器
 * 负责管理当前打开场景的 uuid 与节点对应关系
 */

const { get, } = require('lodash');
const dumpUtils = require('../utils/dump');
const getComponentFunctionOfNode = require('../utils/get-component-function-of-node');

const Reg_Uuid = /^[0-9a-fA-F-]{36}$/;
const Reg_NormalizedUuid = /^[0-9a-fA-F]{32}$/;
const Reg_CompressedUuid = /^[0-9a-zA-Z+/]{22,23}$/;

/////////////////////////
// 节点管理功能

let uuid2node = {};

/**
 * 传入一个场景，将内部的节点全部缓存
 * @param {*} scene
 */
function init(scene) {
    scene && walk(scene);
}

/**
 * 清空当前管理的节点
 */
function clear() {
    uuid2node = {};
}

/**
 * 添加一个节点到管理器内
 * @param {*} node
 */
function add(node) {
    uuid2node[node._id] = node;
}

/**
 * 从管理起内移除一个指定的节点
 * @param {*} node
 */
function remove(node) {
    delete uuid2node[node._id];
}

/**
 * 查询一个节点的实例
 * @param {*} uuid
 * @return {cc.Node}
 */
function query(uuid) {
    return uuid2node[uuid] || null;
}

/**
 * 查询受管理的所有节点的 uuid 数组
 */
function queryUuids() {
    return Object.keys(uuid2node);
}

/**
 * 查询一个节点，并返回该节点的 dump 数据
 *   如果节点不存在，则返回 null
 * @param {String} uuid
 */
function queryDump(uuid) {
    let node = query(uuid);
    if (!node) {
        return null;
    }
    return dumpUtils.dumpNode(node);
}

/**
 * 设置一个节点的属性
 * @param {*} uuid
 * @param {*} path
 * @param {*} key
 * @param {*} dump
 */
function setProperty(uuid, path, dump) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 恢复数据
    dumpUtils.restoreProperty(node, path, dump);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    if (path === 'parent') {
        // 发送节点修改消息
        Manager.Ipc.send('broadcast', 'scene:node-changed', parent.uuid);
    }
    return true;
}

/**
 * 调整一个数组类型的数据内某个 item 的位置
 * @param uuid 节点的 uuid
 * @param path 数组的搜索路径
 * @param target 目标 item 原来的索引
 * @param offset 偏移量
 */
function moveArrayElement(uuid, path, target, offset) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 __comps__ 实际指向的是 _components
    path = path.replace('__comps__', '_components');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 移动顺序
    if (path === 'children') {
        const child = data[target];
        child.setSiblingIndex(target + offset);
    } else {
        const temp = data.splice(target, 1);
        data.splice(target + offset, 0, temp[0]);
    }

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    return true;
}

/**
 * 删除一个数组元素
 * @param uuid 节点的 uuid
 * @param path 元素所在数组的搜索路径
 * @param index 目标 item 原来的索引
 */
function removeArrayElement(uuid, path, index) {
    const node = query(uuid);
    const key = (path || '').split('.').pop();

    if (key === 'children') {
        console.warn('Unable to change `children` of the parent, Please change the `parent` of the child');
        return false;
    }

    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 __comps__ 实际指向的是 _components
    path = path.replace('__comps__', '_components');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 删除某个 item
    const temp = data.splice(index, 1);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    return true;
}

/**
 * 创建一个组件并挂载到指定的 entity 上
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function createComponent(uuid, component) {
    const node = query(uuid);
    if (!node) {
        console.warn(`create component failed: ${uuid} does not exist`);
        return false;
    }

    if (Reg_Uuid.test(component) || Reg_NormalizedUuid.test(component) || Reg_CompressedUuid.test(component)) {
        component = cc.js._getClassById(component);
    }

    node.addComponent(component);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);
}

/**
 * 移除一个 entity 上的指定组件
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function removeComponent(uuid, component) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    node.removeComponent(component);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);
}

/**
 * 创建一个新节点
 * @param {*} uuid
 * @param {*} name
 * @param {*} data
 */
async function createNode(uuid, name = 'New Node', dump) {
    if (!cc.director._scene) {
        return;
    }

    const parent = query(uuid);
    const node = new cc.Node();

    if (dump) {
        const dumpData = queryNode(dump);
        // 这几个属性不需要赋给一个新节点
        delete dumpData.uuid;
        delete dumpData.parent;
        delete dumpData.children;

        dumpUtils.restoreNode(node, dumpData);
    }

    if (name) {
        node.name = name;
    }

    parent.addChild(node);

    // 爬取节点树上的所有节点数据
    await add(node);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-created', node.uuid);
    Manager.Ipc.send('broadcast', 'scene:node-changed', uuid);

    return node.uuid;
    // return {
    //     uuid: node.uuid,
    //     parentUuid: node._parent.uuid,
    // };
}

/**
 * 删除一个节点
 * @param {*} uuid
 */
function removeNode(uuid) {
    const node = query(uuid);
    const parent = node.parent;
    parent.removeChild(node);

    // 发送节点修改消息
    Manager.Ipc.send('broadcast', 'scene:node-changed', parent.uuid);
    Manager.Ipc.send('broadcast', 'scene:node-removed', node.uuid);

    return parent.uuid;
}

/**
 * 查询节点上所有组件上可运行的方法名
 * @param {*} uuid
 */
function queryComponentFunctionOfNode(uuid) {
    const node = query(uuid);

    if (!node) {
        return {};
    }
    return getComponentFunctionOfNode(node);
}

/////////////////////////
// 工具函数

/**
 * 爬取节点上的数据
 * @param children
 */
function walkChild(node) {
    uuid2node[node._id] = node;
    node.children && node.children.forEach((child) => {
        walkChild(child);
    });
}

/**
 * 爬取 engine 内打开的场景的节点数据
 * @param {*} scene
 */
function walk(scene) {
    walkChild(scene);
}

let Utils = {
    // 从一个场景初始化所有被管理的节点
    init,
    // 清空所有管理的节点
    clear,
    // 添加一个节点到管理器
    add,
    // 从管理器内移除一个指定的节点
    remove,
    // 查询一个节点的实例
    query,
    // 查询受管理的所有节点的 uuid 数组
    queryUuids,

    // 查询一个节点的 dump 数据
    queryDump,

    // 设置一个节点上某个属性的数据
    setProperty,
    // // 插入一个数组类型的属性项
    // insertArrayElement,
    // 移动一个数组类型的属性项
    moveArrayElement,
    // 删除一个数组类型的属性项
    removeArrayElement,

    // 创建一个组件并挂到指定的节点上
    createComponent,
    // 移除一个节点上的指定组件
    removeComponent,

    // 创建节点
    createNode,
    // 移除节点
    removeNode,

    // 查询节点上所有组件上可运行的方法名
    queryComponentFunctionOfNode,
};

let tempMatrix = cc.mat4();
let tempQuat = cc.quat();
let tempVec3 = cc.v3();

// return [bl, tr, tr, br]
Utils.getObbFromRect = function (mat, rect, out_bl, out_tl, out_tr, out_br) {
    let x = rect.x;
    let y = rect.y;
    let width = rect.width;
    let height = rect.height;

    let tx = mat.m00 * x + mat.m04 * y + mat.m12;
    let ty = mat.m01 * x + mat.m05 * y + mat.m13;
    let xa = mat.m00 * width;
    let xb = mat.m01 * width;
    let yc = mat.m04 * height;
    let yd = mat.m05 * height;

    out_bl = out_bl || cc.v2();
    out_tl = out_tl || cc.v2();
    out_tr = out_tr || cc.v2();
    out_br = out_br || cc.v2();

    out_tl.x = tx;
    out_tl.y = ty;
    out_tr.x = xa + tx;
    out_tr.y = xb + ty;
    out_bl.x = yc + tx;
    out_bl.y = yd + ty;
    out_br.x = xa + yc + tx;
    out_br.y = xb + yd + ty;

    return [out_bl, out_tl, out_tr, out_br,];
};

Utils.getWorldBounds = function (node, size, out) {
    size = size || cc.size(0, 0);
    let width = size.width;
    let height = size.height;
    let rect = new cc.Rect(0, 0, width, height);
    node.getWorldMatrix(tempMatrix);
    rect.transformMat4(rect, tempMatrix);

    if (out) {
        out.x = rect.x;
        out.y = rect.y;
        out.width = rect.width;
        out.height = rect.height;
        return out;
    } else {
        return rect;
    }
};

Utils.getWorldOrientedBounds = function (node, size, out_bl, out_tl, out_tr, out_br) {
    size = size || cc.size(0, 0);
    let width = size.width;
    let height = size.height;
    let rect = new cc.Rect(0, 0, width, height);

    node.getWorldMatrix(tempMatrix);
    return Utils.getObbFromRect(tempMatrix, rect, out_bl, out_tl, out_tr, out_br);
};

Utils.getScenePosition = function (node) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access scenePosition if no running scene');
        return cc.Vec3.ZERO;
    }

    return node.getWorldPosition(tempVec3);
};

Utils.setScenePosition = function (node, value) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access scenePosition if no running scene');
        return;
    }

    node.setWorldPosition(value);
};

Utils.getSceneRotation = function (node) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access sceneRotation if no running scene');
        return 0;
    }

    return Utils.getWorldRotation(node);
};

Utils.setSceneRotation = function (node, value) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access sceneRotation if no running scene');
        return;
    }

    Utils.setWorldRotation(value);
};

Utils.getWorldPosition = function (node) {
    return node.getWorldPosition();
};

Utils.setWorldPosition = function (node, value) {
    if (value instanceof cc.Vec3) {
        node.setWorldPosition(value);
    } else {
        cc.error('The new worldPosition must be cc.Vec3');
    }
};

Utils.getWorldRotation = function (node) {
    return node.getWorldRotation(tempQuat);
};

Utils.setWorldRotation = function (node, value) {
    if (value instanceof cc.Quat) {
        node.setWorldPosition(value);
    } else {
        cc.error('The new worldPosition must be cc.Vec3');
    }
};

Utils.getWorldScale = function (node) {
    // TODO adaptation to use vec3
    return node.getWorldScale(tempVec3);
};

/**
 * 查找所有 Component, 看是否有任一符合标记的
 * @method _hasFlagInComponents
 * @param {Number} flag - 只能包含一个标记, 不能是复合的 mask
 * @returns {boolean}
 */
Utils._hasFlagInComponents = function (node, flag) {
    let comps = node._components;
    for (let c = 0, len = comps.length; c < len; ++c) {
        let comp = comps[c];
        if (comp._objFlags & flag) {
            return true;
        }
    }
    return false;
};

function invokeOnDestroyRecursively(node) {
    let originCount = node._components.length;
    for (let c = 0; c < originCount; ++c) {
        let component = node._components[c];
        if (cc.engine._isPlaying || component.constructor._executeInEditMode) {
            if (component.onDestroy) {
                try {
                    component.onDestroy();
                } catch (e) {
                    cc._throw(e);
                }
            }
        }
    }
    // deactivate children recursively
    for (let i = 0, len = node.childrenCount; i < len; ++i) {
        let entity = node._children[i];
        if (entity._active) {
            entity._disableChildComps();
        }
    }
}

Utils._destroyForUndo = function (nodeOrComp, recordFunc) {
    if (cc.Node.isNode(nodeOrComp)) {
        // invoke all callbacks of components
        if (nodeOrComp._activeInHierarchy) {
            nodeOrComp._disableChildComps();
        }
        invokeOnDestroyRecursively(nodeOrComp);
    }

    recordFunc();

    // destroy after record
    nodeOrComp.destroy();

    Editor.Ipc.sendToAll('scene:delete-nodes-in-scene');
};

Utils.getNodePath = function (node) {
    let path = '';
    while (node && !(node instanceof cc.Scene)) {
        if (path) {
            path = node.name + '/' + path;
        } else {
            path = node.name;
        }
        node = node._parent;
    }
    return path;
};

var stack = new Array(32);
Utils.getChildUuids = function (root, insertRoot) {
    var res = [];
    if (insertRoot) {
        res.push(root.uuid);
    }
    // push root to parsing stack
    var topIndex = 0;
    stack[0] = root;
    //
    while (topIndex >= 0) {
        // pop
        var curr = stack[topIndex];
        stack[topIndex] = null;
        --topIndex;
        //
        if (!curr) { continue; }
        var children = curr._children;
        if (!children) { continue; }
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];
            // push
            ++topIndex;
            stack[topIndex] = child;
            // iterate
            res.push(child.uuid);
        }
    }
    return res;
};

/**
 * 从一个 asset 内创建新的节点
 * @param {*} uuid
 * @param {*} callback
 */
Utils.createNodeFromAsset = function (uuid, callback) {
    const Sandbox = require('../lib/sandbox');
    cc.AssetLibrary.queryAssetInfo(uuid, (error, url, isRaw, assetType) => {
        if (error) {
            return callback(error);
        }

        if (isRaw) {
            callback(new Error('Can not create node from raw asset: ' + cc.js.getClassName(assetType)));
            return;
        }

        if (cc.js.isChildClassOf(assetType, cc._Script)) {
            let cid = Editor.Utils.UuidUtils.compressUuid(uuid);
            let Class = cc.js._getClassById(cid);
            let node;
            if (cc.js.isChildClassOf(Class, cc.Component)) {
                node = new cc.Node(cc.js.getClassName(Class));
                node.addComponent(Class);
                callback(null, node);
            } else {
                let Url = !CC_TEST && require('fire-url');
                let script = Url.basename(url);

                if (Editor.remote.Compiler.state === 'compiling' || Sandbox.reloading) {
                    callback(new Error(`Can not load "${script}", please wait for the scene to reload.`));
                } else {
                    callback(new Error(`Can not find a component in the script "${script}".`));
                }
            }
            return;
        }

        cc.AssetLibrary.loadAsset(uuid, (err, asset) => {
            if (err) {
                return callback(err);
            }

            if (asset.createNode) {
                if (asset instanceof cc.Prefab) {
                    let autoSync = Editor.globalProfile.data['auto-sync-prefab'];
                    if (autoSync) {
                        let PrefabUtils = require('./prefab');
                        PrefabUtils._setPrefabSync(asset.data, true);
                    }
                }
                asset.createNode(callback);
            } else {
                callback(new Error('Can not create node from ' + cc.js.getClassName(assetType)));
            }
        });
    });
};

/**
 * 根据 class 创建一个新的节点
 * @param {*} classID
 * @param {*} callback
 */
Utils.createNodeFromClass = function (classID, callback) {
    let node = new cc.Node();
    let error = null;

    if (classID) {
        // add component
        let CompCtor = cc.js._getClassById(classID);
        if (CompCtor) {
            var comp = node.addComponent(CompCtor);
            if (comp) {
                cc.director._nodeActivator.resetComp(comp);
            }
        } else {
            error = new Error(`Unknown node to create: ${classID}`);
        }
    }

    callback && callback(error, node);
};

Utils.makeVec3InPrecision = function (inVec3, precision) {
    inVec3.x = Editor.Math.toPrecision(inVec3.x, precision);
    inVec3.y = Editor.Math.toPrecision(inVec3.y, precision);
    inVec3.z = Editor.Math.toPrecision(inVec3.z, precision);

    return inVec3;
};

Utils.getWorldPosition3D = function (node) {
    return node.getWorldPosition();
};

Utils.setWorldPosition3D = function (node, value) {
    node.setWorldPosition(value);
};

Utils.getWorldRotation3D = function (node) {
    return node.getWorldRotation();
};

Utils.setWorldRotation3D = function (node, value) {
    node.setWorldRotation(value);
};

Utils.getEulerAngles = function (node) {
    return cc.vmath.quat.toEuler(tempQuat, node.getRotation(tempVec3));
};

Utils.setEulerAngles = function (node, value) {
    node.setRotationFromEuler(value.x, value.y, value.z);
};

module.exports = Utils;
