'use strict';

const wins = require('@base/electron-windows');
const $panel = document.getElementById('panel');
$panel.setAttribute('name', wins.userData.panel);

window.__MAIN__ = false;

// 首先初始化任务管理器
require('../../../../task');

// 初始化插件注册到每个窗口的代码
require('../public/windows');

requestAnimationFrame(() => {
    window.Editor = require('../../../../editor');
    Editor.Task.sync();
});
