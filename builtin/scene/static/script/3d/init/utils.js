'use stirct';

const ipc = require('../../public/ipc/webview');

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

    const warnSet = new Set();
    const errorSet = new Set();
    const limit = 200; // 最多同时发两百条

    let warnTimer = null;
    let errorTimer = null;

    handleMessage = (args, type) => {
        const set = type === 'warn' ? warnSet : errorSet;
        set.add(
            args
                .map((item) => {
                    if (item instanceof Error) {
                        const { message, stack } = item;
                        return `${message}\n${stack}`;
                    }
                    return item;
                })
                .join('\0')
        );
    };

    console.warn = function(...args) {
        backup.warn(...args);
        handleMessage(args, 'warn');

        if (warnTimer !== null) {
            return;
        }

        warnTimer = setTimeout(() => {
            warnTimer = null;
            if (warnSet.size > limit) {
                ipc.forceSend(
                    'console',
                    'warn',
                    'Too many warnings in render process, please open debug tool and check'
                );
            } else {
                for (item of warnSet) {
                    ipc.forceSend('console', 'warn', ...item.split('\0'));
                }
            }
            warnSet.clear();
        }, 200);
    };
    console.error = function(...args) {
        backup.error(...args);
        handleMessage(args);

        if (errorTimer !== null) {
            return;
        }

        errorTimer = setTimeout(() => {
            errorTimer = null;
            if (errorSet.size > limit) {
                ipc.forceSend(
                    'console',
                    'error',
                    'Too many errors in render process, please open debug tool and check'
                );
            } else {
                for (item of errorSet) {
                    ipc.forceSend('console', 'error', ...item.split('\0'));
                }
            }
            errorSet.clear();
        }, 200);
    };

    // 用于编辑器绘制的背景和前景节点
    Manager.foregroundNode = new cc.Node('Editor Scene Foreground');
    Manager.backgroundNode = new cc.Node('Editor Scene Background');
    // 编辑器使用的节点不需要存储和显示在层级管理器
    Manager.foregroundNode._objFlags |= cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy;
    Manager.backgroundNode._objFlags |= cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy;
    // 这些节点应该是常驻节点
    cc.game.addPersistRootNode(Manager.foregroundNode);
    cc.game.addPersistRootNode(Manager.backgroundNode);
};
