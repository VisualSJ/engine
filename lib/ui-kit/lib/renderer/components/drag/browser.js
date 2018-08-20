'use strict';

const ipc = require('@base/electron-base-ipc');

// 拖拽开始事件转发
ipc.on('editor-lib-ui-kit:drag-start', (event, info) => {
    ipc.broadcast('editor-lib-ui-kit:drag-start', info);
});

// 拖拽结束事件转发
ipc.on('editor-lib-ui-kit:drag-end', (event) => {
    ipc.broadcast('editor-lib-ui-kit:drag-end');
});