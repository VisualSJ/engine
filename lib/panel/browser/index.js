'use strict';

const ps = require('path');

const ipc = require('@base/electron-base-ipc');
const win = require('@base/electron-windows');
const panel = require('@editor/panel');

const edit = require('./edit');

const subHTML = ps.join(__dirname, '../windows/static/sub.html');
// const focusedPanel = 'scene'; // 当前获得高亮的面板名称，即插件 package.json 中 name 字段的值

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

    /**
     * 关闭已经注册的指定 panel
     * @param {string} name
     */
    close(name) {
        ipc.broadcast('editor-lib-panel:close', name);
    }

    /**
     * 基于 panel 的 edit 命令
     */
    edit(action) {
        edit[action] && edit[action]();
    }
}

module.exports = new Panel();

// 页面发送的 panel open 操作请求
ipc.on(`editor-lib-panel:open`, (event, name) => {
    module.exports.open(name);
});

// 页面发送的 panel close 操作请求
ipc.on(`editor-lib-panel:close`, (event, name) => {
    module.exports.close(name);
});
