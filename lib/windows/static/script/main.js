'use strict';
const ipc = require('@base/electron-base-ipc');

const timer = setTimeout(_startup, 1000);
function _startup() {
    clearTimeout(timer);
    window.removeEventListener('resize', _startup);

    // 初始化进度条
    require('./main/startup-mask');

    // 加载 Editor
    // 延迟是因为如果阻塞渲染进程，会有一个 resize 过程导致窗口缩放闪烁
    setTimeout(() => {
        window.Editor = require('../../../editor');
    }, 300);

    // 初始化工具条
    require('./main/toolBar');

    // 监听修改 title 的 ipc 消息
    ipc.on('editor3d-lib-windows:change-title', (event, title) => {
        document.title = title;
    });
}

window.addEventListener('resize', _startup);
