'use strict';

const ps = require('path');
const electron = require('electron');

const ipc = require('@base/electron-base-ipc');
const win = require('@base/electron-windows');
const panel = require('@editor/panel');

const edit = require('./edit');

const subHTML = ps.join(__dirname, '../../windows/static/sub.html');
const simpleHTML = ps.join(__dirname, '../../windows/static/simple.html');

class Panel {

    /**
     * 打开已经注册的指定 panel
     * 如果打开无动作
     * 未打开的状态下，打开一个新窗口，并打开一个新布局，放入当前 panel
     * @param {string} name
     */
    open(name) {
        if (panel.focus(name)) {
            return;
        }

        let info = panel.queryInfo(name);
        // panel 没有注册
        if (!info) {
            console.log(`Panel[${name}] is not registered yet`);
            return;
        }

        if (info.userData.type === 'simple') {
            let userData = info.userData || {};
            win.open(simpleHTML, {
                width: userData.width,
                height: userData.height,
                autoHideMenuBar: true,
            }, {
                panel: name,
            });
        } else {
            // 打开新窗口，并且启动指定的 panel
            let userData = info.userData || {};
            win.open(subHTML, {
                width: userData.width,
                height: userData.height,
                autoHideMenuBar: true,
            }, {
                layout: {
                    version: 1,
                    'min-width': userData['min-width'],
                    'min-height': userData['min-height'],
                    layout: {
                        percent: 1,
                        panels: [name],
                    },
                },
            });
        }
    }

    /**
     * 关闭已经注册的指定 panel
     * @param {string} name
     */
    async close(name) {
        // 关闭消息直接发到对应窗口，并且监听返回值
        const id = panel.getWindow(name);
        if (id === null || id === undefined) {
            return true;
        }
        const win = electron.BrowserWindow.fromId(id);
        // 返回值为 true 时，面板关闭，反之面板没有被关闭
        return await ipc.sendToWin(win, 'editor-lib-panel:close', name);
    }

    /**
     * 基于 panel 的 edit 命令
     * @param {string} action undo | redo | copy | cut | paste
     */
    edit(action) {
        edit[action] && edit[action]();
    }
}

module.exports = new Panel();

// 页面发送的 panel close 操作请求
ipc.on('editor-lib-panel:call', (event, func, ...args) => {
    const handle = module.exports[func];
    if (!handle) {
        return;
    }
    handle.call(module.exports, ...args);
});

// Hack 兼容处理 window 平台上的 undo redo 自上而下分发
ipc.on('editor-lib-panel:win32-undo', (event, name) => {
    edit.undo();
});
ipc.on('editor-lib-panel:win32-redo', (event, name) => {
    edit.redo();
});

// Hack 兼容处理 window 平台上的 electron menu 对 copy paste cut 不从顶层触发的问题
ipc.on('editor-lib-panel:win32-copy', (event, name) => {
    edit.copy();
});
ipc.on('editor-lib-panel:win32-paste', (event, name) => {
    edit.paste();
});
ipc.on('editor-lib-panel:win32-cut', (event, name) => {
    edit.cut();
});
