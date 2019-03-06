'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');

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
        ipc.send('editor-lib-selection:call', 'select', [type, uuid]);
    }

    /**
     * 取消某个物体的选中状态
     * @param {*} type
     * @param {*} uuid
     */
    unselect(type, uuid) {
        ipc.send('editor-lib-selection:call', 'unselect', [type, uuid]);
    }

    /**
     * 清空一个选中的类型
     * @param {*} type
     */
    clear(type) {
        ipc.send('editor-lib-selection:call', 'clear', [type]);
    }

    /**
     * hover
     * @param {*} type
     * @param {*} uuid
     */
    hover(type, uuid) {
        ipc.send('editor-lib-selection:call', 'hover', [type, uuid]);
    }

    /**
     * 获取最后选中的类型
     */
    getLastSelectedType() {
        return ipc.sendSync('editor-lib-selection:call', 'getLastSelectedType');
    }

    /**
     * 获取一个类型最后选中的一个元素
     * @param {*} type
     */
    getLastSelected(type) {
        return ipc.sendSync('editor-lib-selection:call', 'getLastSelected', [type]);
    }

    /**
     * 获取一个类型选中的所有元素数组
     * @param {*} type
     */
    getSelected(type) {
        return ipc.sendSync('editor-lib-selection:call', 'getSelected', [type]);
    }
}

module.exports = new Selection();
