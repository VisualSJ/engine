'use strict';

/**
 * 记录设置 property 的 undo 操作
 * @param uuid 修改的节点的 uuid
 * @param path
 * @param key
 * @param oldDump
 * @param newDump
 */
export function setProperty(uuid: string, path: string, key: string, oldDump: PropertyDump, newDump: PropertyDump) {
    Editor.History.record({
        panel: 'scene',
        redo: {
            message: 'set-property',
            params: [{
                uuid, path, key, dump: oldDump,
            }],
        },
        undo: {
            message: 'set-property',
            params: [{
                uuid, path, key, dump: newDump,
            }],
        },
    });
}

/**
 * 记录更改数组的 undo 操作
 * @param uuid 节点的 uuid
 * @param path 属性所在 object 的搜索路径
 * @param key 属性所在位置的 key
 * @param index 插入数组的位置
 * @param dump 数组 dump 值
 */
export function insertArrayProperty(uuid: string, path: string, key: string, index: number, dump: PropertyDump) {
    Editor.History.record({
        panel: 'scene',
        redo: {
            message: 'insert-array-element',
            params: [{
                uuid, path, key, index, dump,
            }],
        },
        undo: {
            message: 'remove-array-element',
            params: [{
                uuid, path, key, index,
            }],
        },
    });
}

/**
 * 记录移动数组内 item 顺序的 undo 操作
 * @param uuid 节点的 uuid
 * @param path 数组所在 object 的搜索路径
 * @param key 数组的 key
 * @param target 需要移动的 item 的原始位置
 * @param offset 移动的偏移量
 */
export function moveArrayProperty(uuid: string, path: string, key: string, target: number, offset: number) {
    Editor.History.record({
        panel: 'scene',
        redo: {
            message: 'move-array-element',
            params: [{
                uuid, path, key, target, offset,
            }],
        },
        undo: {
            message: 'move-array-element',
            params: [{
                uuid, path, key,
                target: target + offset,
                offset: -offset,
            }],
        },
    });
}

/**
 * 记录删除数组内 item 的 undo 操作
 * @param uuid 节点的 uuid
 * @param path 数组所在 object 的搜索路径
 * @param key 数组的 key
 * @param index 需要删除的 item 的索引
 * @param dump 被删除的 item 的 dump 数据
 */
export function removeArrayProperty(uuid: string, path: string, key: string, index: number, dump: PropertyDump) {
    Editor.History.record({
        panel: 'scene',
        redo: {
            message: 'remove-array-element',
            params: [{
                uuid, path, key, index,
            }],
        },
        undo: {
            message: 'insert-array-element',
            params: [{
                uuid, path, key, index, dump,
            }],
        },
    });
}
