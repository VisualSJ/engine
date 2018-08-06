'use strict';

/////////////
// 节点管理器
// 场景打开后，建立节点的索引关系

import {
    dumpNode,
    restoreProperty,
} from '../utils/dump';

const get = require('lodash/get');

let uuid2node: {[index: string]: any} = {};

/**
 * 爬取节点上的数据
 * @param children 
 */
function walkChildren (children: any[]) {
    if (!children) {
        return;
    }
    for (let i=0; i<children.length; i++) {
        let child = children[i];
        if (!child) {
            break;
        }
        uuid2node[child._id] = child;
        if (child._children && child._children.length) {
            walkChildren(child._chldren);
        }
    }
};

/**
 * 爬取 engine 内打开的场景的节点数据
 * @param app 
 */
export function walk (app: any) {
    walkChildren(app._entities._data);
};

/**
 * 查询 uuid 对应的节点
 * @param uuid 
 */
export function query (uuid: string) {
    return uuid2node[uuid] || null;
};

/**
 * 设置一个节点的属性
 * @param uuid 节点的 uuid
 * @param path 属性的路径，'' | '_comps.0'
 * @param key 属性的 key，'name' | 'active'
 * @param dump 对应属性的值
 */
export function setProperty (uuid: string, path: string, key: string, dump: PropertyDump) {
    let node: any = query(uuid);
    if (!node) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Set property failed: ${uuid} does not exist`);
        return;
    }

    if (key === 'parent') {
        // 广播父节点更改消息
        Editor.Ipc.sendToAll('scene:node-changed', node.parent._id);
    }

    // 恢复数据
    restoreProperty(dump, data, key);

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-changed', uuid);
};

/**
 * 调整一个数组类型的数据内某个 item 的位置
 * @param uuid 节点的 uuid
 * @param path 属性的搜索路径
 * @param target 目标 item 原来的索引
 * @param offset 偏移量
 */
export function moveProperty (uuid: string, path: string, key: string, target: number, offset: number) {
    let node: any = query(uuid);
    if (!node) {
        return console.warn(`Move property failed: ${uuid} does not exist`);
    }

    // 找到指定的 data 数据
    let data = path ? get(node, path) : node;
    if (!data) {
        console.warn(`Move property failed: ${uuid} does not exist`);
        return;
    }

    data = data[key];
    if (!Array.isArray(data)) {
        return console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
    }

    let temp = data.splice(target, 1);
    data.splice(target + offset, 0, temp[0]);

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-changed', uuid);
};

/**
 * 获取一个节点的 dump 数据
 * 如果不传入 uuid 则获取场景的 dump 数据
 * @param uuid 
 */
export function dump (uuid: string) {
    if (uuid) {
        let node = query(uuid);
        return dumpNode(node);
    }
};

/**
 * 节点是否存在
 * @param uuid 
 */
export function exists (uuid: string) : boolean {
    return !!uuid2node[uuid];
};