'use strict';

const ipc = require('@base/electron-base-ipc');

const dom = require('./dom');

class Task {

    addSyncTask(title, describe) {
        ipc.sendSync('editor-lib-task:call', 'addSyncTask', title, describe);
    }

    removeSyncTask(title) {
        ipc.sendSync('editor-lib-task:call', 'removeSyncTask', title);
    }
}

module.exports = new Task();

ipc.on('editor-lib-task:show', (event, title, describe) => {
    if (title) {
        dom.show(title, describe);
    } else {
        dom.show();
    }
});
