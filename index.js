'use stirct';

// 初始化 Editor
// 在这个过程中，会加载每个模块，并且监听一些初始化事件
// Editor 这个全局对象应该避免在编辑器内部使用
global.Editor  = require('./lib/editor');

(async function () {
    // 开始编辑器启动流程
    const startup = require('./lib/startup');

    // 启动窗口
    await startup.window();

    // 打开各个插件, 这是个异步流程
    // 在启动插件过程中会实时与窗口进行交互，等待加载完成
    await startup.package();
})();
