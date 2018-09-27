'use strict';

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
}

window.addEventListener('resize', _startup);

window.startPreview = function() {
    Editor.Ipc.sendToPackage('preview', 'open-terminal', 'browser');
};

window.refreshPreview = function() {
    Editor.Ipc.sendToPackage('preview', 'reload-terminal');
};
