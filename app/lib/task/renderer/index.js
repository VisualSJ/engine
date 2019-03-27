'use strict';

const ipc = require('@base/electron-base-ipc');

const dom = require('./dom');

class Task {

    constructor() {
        dom.show('wait', 'i18n:startup.wait');
    }

    sync() {
        ipc.send('editor-lib-task:query').callback((error, title, describe) => {
            dom.show(title, describe);
        });
    }

    addSyncTask(title, describe, message) {
        ipc.sendSync('editor-lib-task:call', 'addSyncTask', title, describe, message);
    }

    removeSyncTask(title) {
        ipc.sendSync('editor-lib-task:call', 'removeSyncTask', title);
    }
}

module.exports = new Task();

ipc.on('editor-lib-task:show', (event, title, describe, message) => {
    if (title) {
        dom.show(title, describe, message);
    } else {
        dom.show();
    }
});
