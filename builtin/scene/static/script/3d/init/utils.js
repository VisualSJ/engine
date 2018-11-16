'use stirct';

const ipc = require('../../ipc/webview');

/**
 * 初始化一些工具函数
 * @param {*} path
 */
module.exports = function(path) {
    // 序列化
    Manager._serialize = function() {
        return require(path + '/serialize');
    };

    const backup = {
        warn: console.warn.bind(console),
        error: console.error.bind(console),
    };

    console.warn = function(...args) {
        backup.warn(...args);
        ipc.send('console', 'warn', ...args);
    };
    console.error = function(...args) {
        backup.error(...args);
        ipc.send('console', 'error', ...args);
    };

    // 用于编辑器绘制的背景和前景节点
    Manager.foregroundNode = new cc.Node('Editor Scene Foreground');
    Manager.backgroundNode = new cc.Node('Editor Scene Background');
    // 编辑器使用的节点不需要存储和显示在层级管理器
    Manager.foregroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
    Manager.backgroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
    // 这些节点应该是常驻节点
    cc.game.addPersistRootNode(Manager.foregroundNode);
    cc.game.addPersistRootNode(Manager.backgroundNode);

    Manager.Node.__init();
};
