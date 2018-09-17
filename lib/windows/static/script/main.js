"use strict";

function startPreview() {
    window.Editor.Ipc.sendToPackage('preview', 'open-terminal', 'browser');
}
function refreshPreview() {
    window.Editor.Ipc.sendToPackage('preview', 'browser-reload');
}

window.onload = () => {
    const q = document.querySelector.bind(document);
    const play = q('#preview-play');
    const reload = q('#preview-reload');
    if (play && reload) {
        play.addEventListener('click', startPreview);
        reload.addEventListener('click', refreshPreview);
    }
};

function _startup() {
    clearTimeout(_startupTimer);
    window.removeEventListener('resize', _startup);

    setTimeout(() => {
        window.Editor = require('../../../editor');
        // 初始化进度条
        require('./main/startup-mask');
    }, 300);
}

window.addEventListener('resize', _startup);
let _startupTimer = setTimeout(_startup, 1000);
