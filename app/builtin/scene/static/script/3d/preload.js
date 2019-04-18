'use strict';

const ipc = require('./manager/ipc');
const startup = require('./manager/startup');
window.Manager = { Startup: startup };

// 延迟一帧通知 webview 已经启动
requestAnimationFrame(async () => {
    ipc.forceSend('ready');
});

// 进程刷新的时候，需要通知宿主进程关闭
window.addEventListener('beforeunload', () => {
    ipc.send('immediately-dump', Manager.Scene.dump());
    ipc.send('close');
});
