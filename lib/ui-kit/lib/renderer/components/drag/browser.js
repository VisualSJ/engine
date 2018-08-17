'use strict';

const ipc = require('@base/electron-base-ipc');

ipc.on('editor-lib-ui-kit:drag-start', (event, info) => {
    ipc.broadcast('editor-lib-ui-kit:drag-start', info);
});

ipc.on('editor-lib-ui-kit:drag-end', (event) => {
    ipc.broadcast('editor-lib-ui-kit:drag-end');
});