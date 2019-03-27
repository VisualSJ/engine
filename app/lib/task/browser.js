'use strict';

const ipc = require('@base/electron-base-ipc');

class Task {

    constructor() {
        this.syncTasks = [];
        this.syncTaskMap = {};
        this.timer = null;
    }

    _updateSyncMask() {
        const task = this.syncTasks[0];
        if (task) {
            ipc.broadcast('editor-lib-task:show', task.title, task.describe, task.message);
        } else {
            ipc.broadcast('editor-lib-task:show', null);
        }
    }

    /**
     * 立即同步一次任务信息
     */
    updateSyncMask() {
        if (this.timer !== null) {
            return;
        }
        this.timer = setTimeout(() => {
            this._updateSyncMask();
            this.timer = null;
        }, 500);
    }

    /**
     * 添加一个同步的任务
     * @param {*} title 
     * @param {*} describe 
     * @param {*} message 
     */
    addSyncTask(title, describe, message) {
        let task = this.syncTaskMap[title];
        if (task) {
            task.describe = describe;
            task.message = message;
            this.updateSyncMask();
            return;
        }
        this.removeSyncTask(title);
        task = {
            title, describe, message,
        };
        this.syncTaskMap[title] = task;
        this.syncTasks.push(task);
        this.updateSyncMask();
    }

    /**
     * 移除一个同步任务
     * @param {*} title 
     */
    removeSyncTask(title) {
        const task = this.syncTaskMap[title];
        if (!task) {
            return;
        }
        const index = this.syncTasks.indexOf(task);
        if (index !== -1) {
            this.syncTasks.splice(index, 1);
        }
        delete this.syncTaskMap[title];
        this.updateSyncMask();
    }
}

module.exports = new Task();

ipc.on('editor-lib-task:call', async (event, func, ...args) => {
    try {
        const files = await module.exports[func](...args);
        event.reply(null, files || []);
    } catch (error) {
        event.reply(error, []);
    }
});

ipc.on('editor-lib-task:query', (event) => {
    const task = module.exports.syncTasks[0];
    if (task) {
        event.reply(null, task.title, task.describe, task.message);
    } else {
        event.reply(null, '');
    }
});
