'use strict';
const ipc = require('@base/electron-base-ipc');

const timer = setTimeout(_startup, 1000);
function _startup() {
    clearTimeout(timer);
    window.removeEventListener('resize', _startup);

    // 初始化进度条
    require('./main/startup-mask');

    // 加载 Editor
    window.Editor = require('../../../editor');

    // 初始化工具条
    require('./main/toolbar');

    // 监听修改 title 的 ipc 消息
    ipc.on('notice:editor-title-change', (event, title) => {
        document.title = title;
    });
}

window.addEventListener('resize', _startup);
