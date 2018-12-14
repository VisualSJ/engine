'use strict';

const ipc = require('./manager/ipc');
const startup = require('./manager/startup');

// 延迟一帧启动引擎
//   1. 注册 Editor 以及引擎需要用的标记
//   2. 启动引擎
//   3. 启动引擎进程内的模块管理器
//   4. 重写资源加载相关的函数
requestAnimationFrame(async () => {
    const info = await ipc.send('query-engine');
    await startup.init(info);
    // manager 方法通过监听 db、engine 的 ready 执行
    //     await startup.manager(info);
});

// 进程刷新的时候，需要广播
window.addEventListener('beforeunload', () => {
    ipc.send('manager:close');
    ipc.send('engine:close');
    ipc.send('broadcast', 'scene:close');
});
