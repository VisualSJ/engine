'use strict';

const ipc = require('./manager/ipc');
const startup = require('./manager/startup');

// 延迟一帧启动引擎
//   1. 注册 Editor 以及引擎需要用的标记
//   2. 启动引擎
//   3. 启动引擎进程内的模块管理器
//   4. 重写资源加载相关的函数
requestAnimationFrame(async () => {
    window.Manager = require('./manager');
    // 初始化引擎
    startup.run();
});

// 进程刷新的时候，需要广播
window.addEventListener('beforeunload', () => {
    ipc.send('broadcast', 'scene:close');
});
