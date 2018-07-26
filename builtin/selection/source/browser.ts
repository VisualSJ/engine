'use strict';

let selection: {[index: string]: string[]}  = {};

// todo
// 这里只记录了最后一次选中的 type
// 但实际情况是需要记录一个队列
// 比如选中一个 asset，然后选中一个 node，取消选中的 node，这时候最后选中的应该是 asset
let lastSelectType: string = '';

export const messages = {

    /**
     * 选中某个物体
     * @param event 
     * @param type 
     * @param uuid 
     */
    'select' (event: IPCEvent, type: string, uuid: string | string[]) {
        lastSelectType = type;

        let array = selection[type] = selection[type] || [];
        
        // 循环存储节点并广播消息
        if (Array.isArray(uuid)) {
            uuid.forEach((id) => {
                let index = array.indexOf(id);
                if (index !== -1) {
                    array.splice(index, 1);
                }
                array.push(id);
                if (index === -1) {
                    Editor.Ipc.sendToAll('selection:select', type, id);
                }
            });
        } else {
            let index = array.indexOf(uuid);
            if (index !== -1) {
                array.splice(index, 1);
            }
            array.push(uuid);
            if (index === -1) {
                Editor.Ipc.sendToAll('selection:select', type, uuid);
            }
        }
    },

    /**
     * 取消选中某个物体
     * @param event 
     * @param type 
     * @param uuid 
     */
    'unselect' (event: IPCEvent, type: string, uuid: string | string[]) {
        if (!selection[type]) {
            return;
        }

        let array = selection[type];

        // 循环存储节点并广播消息
        if (Array.isArray(uuid)) {
            uuid.forEach((id) => {
                let index = array.indexOf(id);
                if (index !== -1) {
                    array.splice(index, 1);
                    Editor.Ipc.sendToAll('selection:unselect', type, id);
                }
            });
        } else {
            let index = array.indexOf(uuid);
            if (index !== -1) {
                array.splice(index, 1);
                Editor.Ipc.sendToAll('selection:unselect', type, uuid);
            }
        }
    },

    /**
     * 清空莫哥类型选中的所有物体
     * @param event 
     * @param type 
     */
    'clear' (event: IPCEvent, type: string) {
        if (!selection[type]) {
            return;
        }

        selection[type].forEach((uuid) => {
            Editor.Ipc.sendToAll('selection:unselect', type, uuid);
        });
        delete selection[type];
    },

    /**
     * 查询最后一个选中的物体类型
     * @param event 
     */
    'query-laset-select-type' (event: IPCEvent) {
        event.reply(null, lastSelectType);
    },

    /**
     * 查询一个类型最后选中的物体
     * @param event 
     */
    'query-laset-select' (event: IPCEvent, type: string) {
        if (!selection[type]) {
            return;
        }

        let array = selection[type];
        event.reply(null, array[array.length - 1] || '');
    },
};

export async function load () {};

export async function unload () {};