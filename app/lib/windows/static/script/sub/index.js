'use strict';

window.__MAIN__ = false;

// 首先初始化任务管理器
require('../../../../task');

// 初始化插件注册到每个窗口的代码
require('../public/windows');

requestAnimationFrame(() => {
    window.Editor = require('../../../../editor');
    Editor.Task.sync();
});
