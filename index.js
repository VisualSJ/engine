'use stirct';

const { existsSync } = require('fs');
const { join } = require('path');
const setting = require('@editor/setting');

// 初始化 Editor
// 在这个过程中，会加载每个模块，并且监听一些初始化事件
// Editor 这个全局对象应该避免在编辑器内部使用
global.Editor  = existsSync(join(__dirname, './lib.asar')) ?
    require('./lib.asar/editor') :
    require('./lib/editor');

(async function() {
    // 如果没有输入项目地址，则启动 dashboard
    if (!setting.PATH.PROJECT) {
        const startup = existsSync(join(__dirname, './dashboard.asar')) ?
            require('./dashboard.asar/startup') :
            require('./dashboard/startup');

        // 等待 app 启动
        await startup.app();
        // 启动窗口
        await startup.window(true);
        // 启动任务栏图标
        await startup.tray();
        // 启动 ipc 监听
        await startup.listener();
        return;
    }

    // 开始编辑器启动流程
    const startup = existsSync(join(__dirname, './lib.asar')) ?
        require('./lib.asar/startup') :
        require('./lib/startup');

    // 启动窗口
    await startup.window();
    // 打开各个插件, 这是个异步流程
    // 在启动插件过程中会实时与窗口进行交互，等待加载完成
    await startup.package();
})();
