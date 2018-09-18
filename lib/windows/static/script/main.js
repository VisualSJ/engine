'use strict';

const timer = setTimeout(_startup, 1000);
function _startup() {
    clearTimeout(timer);
    window.removeEventListener('resize', _startup);

    setTimeout(() => {
        window.Editor = require('../../../editor');
        // 初始化进度条
        require('./main/startup-mask');
    }, 300);
}

window.addEventListener('resize', _startup);

window.startPreview = function() {
    Editor.Ipc.sendToPackage('preview', 'open-terminal', 'browser');
};

window.refreshPreview = function() {
    Editor.Ipc.sendToPackage('preview', 'reload-terminal');
};
