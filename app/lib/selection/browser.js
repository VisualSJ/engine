'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');

const ipcManager = require('../ipc');

class Selection extends EventEmitter {

    constructor() {
        super();

        this._cache = {};
    }

    /**
     * 选中某个物体
     * @param {*} type
     * @param {*} uuid
     */
    select(type, uuid) {
        if (typeof type !== 'string' || typeof uuid !== 'string') {
            return;
        }

        const array = this._cache[type] = this._cache[type] || [];
        if (!Array.isArray(uuid)) {
            uuid = [uuid];
        }

        uuid.forEach((id) => {
            // 如果之前选中过这个元素，则应该移除之前的选中
            for (const i = array.length - 1; i > 0; i--) {
                const item = array[i];
                if (item.id === id) {
                    array.splice(i, 1);
                    // 一个对象只能选中一次，所以找到就可以停止了
                    break;
                }
            }

            // 将这一次的选中对象插入
            array.push({
                id, time: Date.now(),
            });

            ipcManager.sendToAll('selection:select', type, id);
        });
    }

    /**
     * 取消某个物体的选中状态
     * @param {*} type
     * @param {*} uuid
     */
    unselect(type, uuid) {
        if (typeof type !== 'string' || typeof uuid !== 'string') {
            return;
        }

        const array = this._cache[type];

        if (!array) {
            return;
        }

        if (!Array.isArray(uuid)) {
            uuid = [uuid];
        }

        uuid.forEach((id) => {

            // 如果之前选中过这个元素，则应该移除之前的选中
            for (const i = array.length - 1; i > 0; i--) {
                const item = array[i];
                if (item.id === id) {
                    array.splice(i, 1);
                    ipcManager.sendToAll('selection:unselect', type, id);
                    // 一个对象只能选中一次，所以找到就可以停止了
                    break;
                }
            }
        });
    }

    /**
     * 清空一个选中的类型
     * @param {*} type
     */
    clear(type) {
        if (!this._cache[type]) {
            return;
        }

        this._cache[type].forEach((item) => {
            ipcManager.sendToAll('selection:unselect', type, item.id);
        });

        delete this._cache[type];
    }

    /**
     * hover
     * @param {*} type
     * @param {*} uuid
     */
    hover(type, uuid) {
        if (typeof type !== 'string' || typeof uuid !== 'string') {
            return;
        }

        ipcManager.sendToAll('selection:hover', type, uuid);
    }

    /**
     * 获取最后选中的类型
     */
    getLastSelectedType() {
        const types = Object.keys(this._cache);

        let result;
        types.forEach((type) => {
            const arr = this._cache[type];
            if (!arr) {
                return;
            }
            const item = arr[arr.length - 1];
            if (!item) {
                return;
            }
            if (!result || result.time < item.time) {
                result = {
                    type,
                    uuid: item.id,
                    time: item.time,
                };
            }
        });

        return result ? result.type : '';
    }

    /**
     * 获取一个类型最后选中的一个元素
     * @param {*} type
     */
    getLastSelected(type) {
        if (typeof type !== 'string' || !this._cache[type]) {
            return '';
        }

        const array = this._cache[type];
        const item = array[array.length - 1];

        return item ? item.id : '';
    }

    /**
     * 获取一个类型选中的所有元素数组
     * @param {*} type
     */
    getSelected(type) {
        if (typeof type !== 'string') {
            return [];
        }

        return (this._cache[type] || []).map((item) => {
            return item.id;
        });
    }
}

module.exports = new Selection();

// 渲染进程调用主进程的方法
ipc.on('editor-lib-selection:call', (event, name, args = []) => {
    if (module.exports[name]) {
        let data = module.exports[name](...args);
        event.reply(null, data);
        return data;
    }
});
