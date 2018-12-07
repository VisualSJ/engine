'use strict';

const list: string[] = [];
let isReady: boolean = false;

/**
 * 通知其他插件资源数据库状态更新了
 */
function notice() {
    if (list.length !== 0 || isReady) {
        return;
    }
    isReady = true;
    Editor.Ipc.sendToAll('asset-db:ready');
}

/**
 * 打开一个数据库
 */
export function open(name: string) {
    const index = list.indexOf(name);
    if (index !== -1) {
        return;
    }
    list.push(name);
    notice();
}

/**
 * 某个数据库准备就绪
 */
export function ready(name: string) {
    const index = list.indexOf(name);
    if (index === -1) {
        return;
    }
    list.splice(index, 1);
    notice();
}

/**
 * 关闭一个数据库
 */
export function close(name: string) {
    const index = list.indexOf(name);
    if (index === -1) {
        return;
    }
    list.splice(index, 1);
    notice();
}

export function getReady() {
    return isReady;
}
