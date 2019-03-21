'use strict';

window.__MAIN__ = true;

// 加载 Editor
window.Editor = require('../../../../editor');

const ipc = require('@base/electron-base-ipc');

const timer = setTimeout(_startup, 1000);
function _startup() {
    clearTimeout(timer);
    window.removeEventListener('resize', _startup);

    // 初始化顶部工具条
    require('./topbar');

    // 初始化插件注册到每个窗口的代码
    require('../public/windows');

    // 监听修改 title 的 ipc 消息
    ipc.on('notice:editor-title-change', (event, title) => {
        document.title = title;
    });

    Editor.Task.sync();

    ////////////////////////////
    // 加载插件内注册的 windows.js
}

window.addEventListener('resize', _startup);
