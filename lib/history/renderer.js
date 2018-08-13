'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');
const Mousetrap = require('mousetrap');

class Action extends EventEmitter {

    /**
     * 记录一个动作
     * @param {object}} action 
     */
    record (action) {
        ipc.send('editor3d-lib-action:call', 'record', [action]);
    }

    /**
     * 提交当前记录的所有 action
     */
    commit () {
        ipc.send('editor3d-lib-action:call', 'commit');
    }

    /**
     * 清除已经记录的 action 数据
     * @param {*} options 
     */
    clear (options) {
        ipc.send('editor3d-lib-action:call', 'clear', [options]);
    }

    /**
     * 撤销最后一个动作
     */
    undo () {
        ipc.send('editor3d-lib-action:call', 'undo');
    }

    /**
     * 重做做后一个撤销动作
     */
    redo () {
        ipc.send('editor3d-lib-action:call', 'redo');
    }
};

module.exports = new Action();

// 记录页面的撤销和重做按键
let mousetrap = new Mousetrap(document);
if (process.platform === 'win32') {
    mousetrap.bind('ctrl+z', () => {
        module.exports.undo();
    });
    mousetrap.bind('ctrl+y', () => {
        module.exports.redo();
    });
} else {
    mousetrap.bind('command+z', () => {
        module.exports.undo();
    });
    mousetrap.bind('command+shift+z', () => {
        module.exports.redo();
    });
}