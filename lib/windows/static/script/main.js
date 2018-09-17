"use strict";

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