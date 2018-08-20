'use strict';

/////////////
// 节点管理器
// 场景打开后，建立节点的索引关系

import {
    dumpNode,
    dumpProperty,
    restoreComponent,
    restoreProperty,
} from '../utils/dump';

const get = require('lodash/get');

let uuid2node: { [index: string]: any } = {};

/**
 * 爬取节点上的数据
 * @param children
 */
function walkChildren(children: any[]) {
    if (!children) {
        return;
    }
    for (const child of children) {
        uuid2node[child._id] = child;
        if (child._children && child._children.length) {
            walkChildren(child._children);
        }
    }
}

/**
 * 获取一个节点的 dump 数据
 * 如果不传入 uuid 则获取场景的 dump 数据
 * @param uuid
 */
export function dump(uuid: string) {
    if (!uuid) {
        return null;
    }
    const node = query(uuid);
    return dumpNode(node);
}

/**
 * 爬取 engine 内打开的场景的节点数据
 * @param app
 */
export function walk(app: any) {
    uuid2node = {};
    const children = [];

    for (let i = 0; i < app._entities._count; i++) {
        const child = app._entities._data[i];
        if (child._parent && child._parent.constructor.name === 'Level') {
            children.push(child);
        }
    }

    walkChildren(children);
}

/**
 * 查询 uuid 对应的节点
 * @param uuid
 */
export function query(uuid: string) {
    return uuid2node[uuid] || null;
}

/**
 * 设置一个节点的属性
 * @param uuid 节点的 uuid
 * @param path 属性的路径，'' | '_comps.0'
 * @param key 属性的 key，'name' | 'active'
 * @param dump 对应属性的值
 */
export function setProperty(
    uuid: string,
    path: string,
    key: string,
    dump: PropertyDump
) {
    const node: any = query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 找到指定的 data 数据
    const data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 记录当前动作
    Editor.History.record({
        panel: 'scene',
        redo: {
            message: 'set-property',
            params: [{
                uuid, path, key, dump,
            }],
        },
        undo: {
            message: 'set-property',
            params: [{
                uuid, path, key,
                dump: dumpProperty(get(data, key)),
            }],
        },
    });

    // 恢复数据
    restoreProperty(dump, data, key);

    // 提交当前动作
    Editor.History.commit();

    if (key === 'parent') {
        // 广播父节点更改消息
        Editor.Ipc.sendToAll('scene:node-changed', node.parent._id);
    }

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-changed', uuid);
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
export function insertArrayProperty(
    uuid: string,
    path: string,
    key: string,
    index: number,
    dump: PropertyDump
) {
    const node: any = query(uuid);

    if (key === 'children') {
        console.warn('Unable to change `children` of the parent, Please change the `parent` of the child');
        return false;
    }

    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

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
        restoreComponent(dump.value, comp);
        value = comp;
    } else {
        const temp = {value: null};
        restoreProperty(dump, temp, 'value');
        value = temp.value;
    }

    data.splice(index, 0, value);

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-changed', uuid);
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
export function moveArrayProperty(
    uuid: string,
    path: string,
    key: string,
    target: number,
    offset: number
) {
    const node: any = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

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

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-changed', uuid);
    return true;
}

/**
 * 删除一个数组
 * @param uuid 节点的 uuid
 * @param path 属性的搜索路径
 * @param key 属性在搜索到的对象内的 key
 * @param index 目标 item 原来的索引
 */
export function removeArrayProperty(
    uuid: string,
    path: string,
    key: string,
    index: number
) {
    const node: any = query(uuid);
    if (!node) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return false;
    }

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
    data.splice(index, 1);

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-changed', uuid);
    return true;
}
