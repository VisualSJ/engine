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
