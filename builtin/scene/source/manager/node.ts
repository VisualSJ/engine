'use strict';

/////////////
// 节点管理器
// 场景打开后，建立节点的索引关系

let uuid2node: {[index: string]: any} = {};

function walk (children: any[]) {
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
            walk(child._chldren);
        }
    }
};

/**
 * 爬取 engine 内打开的场景的节点数据
 */
export function crawler (app: any) {
    walk(app._entities._data);
    console.log(uuid2node);
};

/**
 * 查询 uuid 对应的节点
 * @param uuid 
 */
export function query (uuid: string) {
    return uuid2node[uuid] || null;
};