'use strict';

const { EventEmitter } = require('events');
const panelManager = require('@editor/panel');
const packageManager = require('@editor/package');
const ipc = require('@base/electron-base-ipc');

class ActionGroup {

    constructor () {
        this.list = [];
    }

    push (action) {
        this.list.push(action);
    }

    undo () {
        this.list.forEach((action) => {
            let undo = action.undo;
            if (action.panel) {
                panelManager.send(action.panel, undo.message, ...undo.params);
            } else if (action.package) {
                packageManager.send(action.package, undo.message, ...undo.params);
            }
        });
    }

    redo () {
        this.list.forEach((action) => {
            let redo = action.redo;
            if (action.panel) {
                panelManager.send(action.panel, redo.message, ...redo.params);
            } else if (action.package) {
                packageManager.send(action.package, redo.message, ...redo.params);
            }
        });
    }
};

class History extends EventEmitter {

    constructor () {
        super();

        this.actions = [];
        this.recycle = [];

        this._actionGroup = null;
    }

    /**
     * 记录一个动作
     * 
     * action {
     *   package: 'scene',
     *   panel: 'scene',
     * 
     *   redo: {
     *     message: 'set-property',
     *     params: [uuid, path, 'name', {type:'string', value: 'name1'}],
     *   },
     * 
     *   undo: {
     *     message: 'set-property',
     *     params: [uuid, path, 'name', {type:'string', value: 'name2'}],
     *   },
     * }
     * 
     * @param {object}} action 
     */
    record (action) {
        if (!this._actionGroup) {
            this._actionGroup = new ActionGroup();
        }

        this._actionGroup.push(action);
    }

    /**
     * 提交当前记录的动作
     */
    commit () {

        let recycle = this.recycle[this.recycle.length - 1];
        let action = this.actions[this.actions.length - 1];

        if (recycle) {
            // 如果之前执行的是 undo，则对比最后一个动作的 redo 和当前 undo
            // 如果一致，则是当前的操作触发
            if (JSON.stringify(recycle.redo) === JSON.stringify(this._actionGroup.undo)) {
                return;
            }
        } else if (action) {
            // 如果之前执行的是 redo，则对比最后一个动作的 undo 和当前 undo
            // 如果一致，则是当前的操作触发
            if (JSON.stringify(action.undo) === JSON.stringify(this._actionGroup.undo)) {
                return;
            }
        }

        this.actions.push(this._actionGroup);
        this._actionGroup = null;
        this.recycle.length = 0;
    }

    /**
     * 清除已经记录的 action 数据
     * @param {*} options 
     */
    clear (options) {
        let panel = options ? options.panel : '';
        let pkg = options ? options.package : '';

        for (let i=0; i<this.actions.length; i++) {
            let action = this.actions[i];
            if (!options || action.list.some((item) => {
                return (panel && item.panel === panel) || (pkg && item.package === pkg);
            })) {
                this.actions.splice(i--, 1);
            }
        }

        for (let i=0; i<this.recycle.length; i++) {
            let action = this.recycle[i];
            if (!options || action.list.some((item) => {
                return (panel && item.panel === panel) || (pkg && item.package === pkg);
            })) {
                this.actions.splice(i--, 1);
            }
        }
    }

    /**
     * 撤销最后一个动作
     */
    undo () {
        let action = this.actions.pop();
        if (!action) {
            return;
        }
        action.undo();
        this.recycle.push(action);
    }

    /**
     * 重做做后一个撤销动作
     */
    redo () {
        let action = this.recycle.pop();
        if (!action) {
            return;
        }
        action.redo();
        this.actions.push(action);
    }
};

module.exports = new History();

ipc.on('editor3d-lib-action:call', (event, func, params = []) => {
    module.exports[func](...params);
});