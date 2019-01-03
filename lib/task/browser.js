'use strict';

const ps = require('path'); // path system

const ipc = require('@base/electron-base-ipc');

class Task {

    constructor() {
        this.syncTasks = [];
        this.syncTaskMap = {};

    }

    updateSyncMask() {
        const task = this.syncTasks[0];
        if (task) {
            ipc.broadcast('editor-lib-task:show', task.title, task.describe);
        } else {
            ipc.broadcast('editor-lib-task:show', null);
        }
    }

    addSyncTask(title, describe) {
        this.removeSyncTask(title);
        const task = {
            title, describe,
        };
        this.syncTaskMap[title] = task;
        this.syncTasks.push(task);
        this.updateSyncMask();
    }

    removeSyncTask(title) {
        const task = this.syncTaskMap[title];
        if (!task) {
            return;
        }
        const index = this.syncTasks.indexOf(task);
        if (index !== -1) {
            this.syncTasks.splice(index, 1);
        }
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
