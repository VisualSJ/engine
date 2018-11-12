'use strict';

const manager = {
    node: require('./node')
};

const uuidUtils = require('../../utils/uuid');

const nodeUtils = require('../utils/node');
const dumpUtils = require('../utils/dump');

const getComponentFunctionOfNode = require('../utils/get-component-function-of-node');
const camera = require('./camera');

const ipc = require('../../ipc/webview');
const { promisify } = require('util');
const { get } = require('lodash');

const Reg_Uuid = /^[0-9a-fA-F-]{36}$/;
const Reg_NormalizedUuid = /^[0-9a-fA-F]{32}$/;
const Reg_CompressedUuid = /^[0-9a-zA-Z+/]{22,23}$/;

/**
 * 打开一个场景
 * @param {*} file
 */
async function open(uuid) {
    // cc.view.resizeWithBrowserSize(true);
    // 查找资源，确认是否存在
    const info = await Manager.Ipc.send('query-asset-info', uuid);
    if (uuid && info) {
        // 加载指定的 uuid
        try {
            await promisify(cc.director._loadSceneByUuid)(uuid);
        } catch (error) {
            console.error(error);
        }
    } else {
        if (uuid && !info) {
            console.error(`scene ${uuid} is not exit`);
        }
        const scene = new cc.Scene();
        const canvas = new cc.Node('Canvas');
        canvas.parent = scene;
        canvas.addComponent(cc.Canvas);
        cc.director.runSceneImmediate(scene);
    }

    camera.setSize(cc.Canvas.instance._designResolution);
    camera.adjustToCenter(10);

    // 爬取节点树上的所有节点数据
    await manager.node.init(cc.director._scene);

    // 重置历史操作数据
    const historyCache = require('./history/cache');
    historyCache.reset();

    // 发送初次打开场景的 uuid
    ipc.send('broadcast', 'scene:ready', cc.director._scene._id);
}

/**
 * 保存场景
 */
async function serialize() {
    let asset = new cc.SceneAsset();
    asset.scene = cc.director._scene;
    cc.Object._deferredDestroy();
    return Manager.serialize(asset);
}

/**
 * 关闭一个场景
 */
function close() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 300);
    });
}

/**
 * 查询节点的 dump 数据
 * @param {*} uuid
 */
function queryNode(uuid) {
    let node = manager.node.query(uuid);
    if (!node) {
        return null;
    }
    return dumpUtils.dumpNode(node);
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
            children: children.length ? children : null
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

function queryComponentFunctionOfNode(uuid) {
    const node = manager.node.query(uuid);

    if (!node) {
        return {};
    }
    return getComponentFunctionOfNode(node);
}

/**
 * 设置一个节点的属性
 * @param {*} uuid
 * @param {*} path
 * @param {*} key
 * @param {*} dump
 */
async function setProperty(uuid, path, dump) {
    const node = manager.node.query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 恢复数据
    await dumpUtils.restoreProperty(node, path, dump);
}

/**
 * 调整一个数组类型的数据内某个 item 的位置
 * @param uuid 节点的 uuid
 * @param path 数组的搜索路径
 * @param target 目标 item 原来的索引
 * @param offset 偏移量
 */
function moveArrayElement(uuid, path, target, offset) {
    const node = manager.node.query(uuid);
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
        console.warn(
            `Move property failed: ${uuid} - ${path}.${key} isn't an array`
        );
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

    return true;
}

/**
 * 删除一个数组元素
 * @param uuid 节点的 uuid
 * @param path 元素所在数组的搜索路径
 * @param index 目标 item 原来的索引
 */
function removeArrayElement(uuid, path, index) {
    const node = manager.node.query(uuid);
    const key = (path || '').split('.').pop();

    if (key === 'children') {
        console.warn(
            'Unable to change `children` of the parent, Please change the `parent` of the child'
        );
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
        console.warn(
            `Move property failed: ${uuid} - ${path}.${key} isn't an array`
        );
        return false;
    }

    // 删除某个 item
    const temp = data.splice(index, 1);

    return true;
}

/**
 * 创建一个组件并挂载到指定的 entity 上
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function createComponent(uuid, component) {
    const node = manager.node.query(uuid);
    if (!node) {
        console.warn(
            `create component failed: ${uuid} does not exist`
        );
        return false;
    }

    let componentInstance;
    if (
        Reg_Uuid.test(component) ||
        Reg_NormalizedUuid.test(component) ||
        Reg_CompressedUuid.test(component)
    ) {
        componentInstance = cc.js._getClassById(component);
    }
    if (!componentInstance) {
        const compressUuid = uuidUtils.compressUuid(component);
        componentInstance = cc.js._getClassById(compressUuid);
    }

    componentInstance && node.addComponent(componentInstance);
}

/**
 * 移除一个 entity 上的指定组件
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function removeComponent(uuid, component) {
    const node = manager.node.query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    node.removeComponent(component);
}

/**
 * 执行 entity 上指定组件的方法
 * @param {*} uuid
 * @param {*} index
 * @param {*} rest
 * @returns
 */
function excuteComponentMethod(uuid, index, ...rest) {
    const node = manager.node.query(uuid);
    if (!node) {
        console.warn(
            `Excute component method failed: ${uuid} does not exist`
        );
        return false;
    }
    const component = node._components[index];
    if (component) {
        rest.map((fn) => {
            if (typeof component[fn] === 'function') {
                component[fn]();
            }
        });
    }
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

    const parent = manager.node.query(uuid);
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
    await manager.node.add(node);

    return {
        uuid: node._id,
        parentUuid: node._parent._id
    };
}

/**
 * 删除一个节点
 * @param {*} uuid
 */
function removeNode(uuid) {
    const node = manager.node.query(uuid);
    const parent = node.parent;
    parent.removeChild(node);
    return parent.uuid;
}

module.exports = {
    // 打开场景
    open,
    // 关闭当前场景（空实现）
    close,
    // 获取当前场景的序列化数据
    serialize,

    // 查询一个节点的 dump 信息
    queryNode,
    // 查询当前场景内的节点树信息
    queryNodeTree,
    // 查询一个节点的搜索路径
    queryNodePath,
    queryComponentFunctionOfNode,

    // 设置一个节点的属性
    setProperty,
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
    // 执行组件方法
    excuteComponentMethod
};
