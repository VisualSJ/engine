'use stirct';

const { readFileSync } = require('fs');
const { get } = require('lodash');
const nodeUtils = require('../utils/node');
const dumpUtils = require('../utils/dump');

let scene = null;
let uuid2node = {};

/**
 * 打开一个场景文件
 * @param {*} file 
 */
function open(file) {
    const $canvas = document.createElement('canvas');
    document.querySelector('.canvas').appendChild($canvas);

    // 启动引擎
    scene = new cc.App($canvas);
    scene.resize();
    scene.debugger.start();

    // @ts-ignore 暴露当前场景
    window.app = scene;

    // 加载指定的场景
    if (file) {
        try {
            require(result);
        } catch (error) {}
    }

    // 爬取所有的节点数据
    nodeUtils.walk(uuid2node, app.activeLevel);

    // 启动场景
    scene.run();
}

/**
 * 关闭当前打开的场景
 */
function close() {
    if (scene) {
        scene.destroy();
    }
    const $canvas = document.body.querySelector('canvas');
    $canvas && $canvas.remove();

    scene = null;
    window.app = null;
}

/**
 * 查询 uuid 对应的节点
 * @param uuid
 */
function query(uuid) {
    return uuid2node[uuid] || null;
}

/**
 * 查询 uuid 对应节点的 dump 数据
 * @param {*} uuid 
 */
function queryNode(uuid) {
    let node = query(uuid);
    if (!node) {
        return null;
    }
    return dumpUtils.dumpNode(node);
}

/**
 * 查询当前运行的场景内的节点树
 * @param uuid 传入的时候生成当前节点的节点树，不传入的话生成场景的节点树
 */
function queryNodeTree(uuid) {
    /**
     * 逐步打包数据
     * @param node
     */
    const step = (node) => {
        return {
            name: node.name,
            uuid: node._id,
            children: node._children.map(step)
        };
    };

    if (uuid) {
        const node = query(uuid);
        if (!node) {
            return null;
        }
        return step(node);
    }

    return step(scene.activeLevel);
}

/**
 * 查询从场景到某个节点的搜索路径
 * @param {*} uuid 
 */
function queryNodePath(uuid) {
    let node = query(uuid);
    if (!node) {
        return '';
    }
    let names = [node.name];
    while(node = node.parent) {
        if (!node) {
            break;
        }
        names.splice(0, 0, node.name);
    }
    return names.join('/');
}

/**
 * 设置属性
 * @param {*} uuid 
 * @param {*} path 
 * @param {*} key 
 * @param {*} dump 
 */
function setProperty(uuid, path, key, dump) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 因为 path 内的 comp 实际指向的是 _comp
    path = path.replace('comps.', '_comps.');

    // 找到指定的 data 数据
    const data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 恢复数据
    dumpUtils.restoreProperty(dump, data, key);
}

/**
 * 插入一个 item 到一个数组类型的 property 内
 * @param uuid 节点的 uuid
 * @param path 属性的搜索路径
 * @param key 属性在搜索到的对象内的 key
 * @param index 目标 item 原来的索引
 * @param dump 插入的数据的 dump 信息
 *
 * @return {boolean} 是否插入成功
 */
function insertArrayProperty(uuid, path, key, index, dump) {
    const node = query(uuid);

    if (key === 'children') {
        console.warn('Unable to change `children` of the parent, Please change the `parent` of the child');
        return false;
    }

    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 comp 实际指向的是 _comp
    path = path.replace('comps.', '_comps.');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    data = data[key];
    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    let value;
    if (dump.extends[0] === 'component') {
        // 如果插入的是一个 component 对象
        // 则需要特殊处理
        const cName = dump.type.replace(/(^\S)(\S+)component/, (all, s, c) => {
            return s.toUpperCase() + c;
        });
        // @ts-ignore
        const Comp = app.getClass(cName);
        const comp = new Comp();
        dumpUtils.restoreComponent(dump.value, comp);
        value = comp;
    } else {
        const temp = {value: null};
        dumpUtils.restoreProperty(dump, temp, 'value');
        value = temp.value;
    }

    data.splice(index, 0, value);

    return true;
}

/**
 * 调整一个数组类型的数据内某个 item 的位置
 * @param uuid 节点的 uuid
 * @param path 属性的搜索路径
 * @param key 属性在搜索到的对象内的 key
 * @param target 目标 item 原来的索引
 * @param offset 偏移量
 */
function moveArrayProperty(uuid, path, key, target, offset) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 comp 实际指向的是 _comp
    path = path.replace('comps.', '_comps.');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    data = data[key];
    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 移动顺序
    const temp = data.splice(target, 1);
    data.splice(target + offset, 0, temp[0]);

    return true;
}

/**
 * 删除一个数组
 * @param uuid 节点的 uuid
 * @param path 属性的搜索路径
 * @param key 属性在搜索到的对象内的 key
 * @param index 目标 item 原来的索引
 */
function removeArrayProperty(uuid, path, key, index) {
    const node = query(uuid);

    if (key === 'children') {
        console.warn('Unable to change `children` of the parent, Please change the `parent` of the child');
        return false;
    }

    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    // 因为 path 内的 comp 实际指向的是 _comp
    path = path.replace('comps.', '_comps.');

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    data = data[key];
    if (!Array.isArray(data)) {
        console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
        return false;
    }

    // 删除某个 item
    const temp = data.splice(index, 1);

    return true;
}

/**
 * 在场景内创建一个新的节点，并挂载到指定的父节点下
 * @param uuid 父节点的 uuid
 * @param name 父节点的 uuid
 * @param data 节点序列化后的数据
 */
function createNode(uuid, name = '', data) {
    if (!scene) {
        return;
    }

    const parent = query(uuid);
    const entity = scene.createEntity(name);

    if (data) {
        // todo 通过 dump 重新生成节点
        // 数据带有 uuid 的情况下, 需要从缓存拿旧的节点对象
    }

    parent.append(entity);
    nodeUtils.walk(uuid2node, entity);

    return entity._id;
}

/**
 * 移除某个节点
 * @param uuid 移除节点的 uuid
 */
function removeNode(uuid) {
    const node = query(uuid);

    // 移除节点,但是不会移除 uuid2node 的节点缓存
    // 因为后续如果需要将节点重新插入回来, 就需要从缓存内拿旧节点对象
    node.remove();
}


/**
 * 创建一个组件并挂载到指定的 entity 上
 * @param uuid entity 的 uuid
 * @param component 组件的名字
 */
function createComponent(uuid, component) {
    const node = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

    node.addComp(component);
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

    node._removeComp(component);
}

module.exports = {
    get uuid2node() {
        return uuid2node;
    },

    open,
    close,

    query,

    queryNode,
    queryNodeTree,
    queryNodePath,

    setProperty,
    insertArrayProperty,
    moveArrayProperty,
    removeArrayProperty,
    
    createComponent,
    removeComponent,

    createNode,
    removeNode,
};