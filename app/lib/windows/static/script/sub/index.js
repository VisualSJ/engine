'use strict';

window.__MAIN__ = false;

window.Editor = require('../../../../editor');

// 首先初始化任务管理器
require('../../../../task');

// 初始化插件注册到每个窗口的代码
require('../public/windows');

Editor.Task.sync();

