'use strict';

const ps = require('path');

const ipc = require('@base/electron-base-ipc');
const win = require('@base/electron-windows');
const panel = require('@editor/panel');

const subHTML = ps.join(__dirname, '../../windows/sub.html');

class Panel {

    /**
     * 打开已经注册的指定 panel
     * 如果打开无动作
     * 未打开的状态下，打开一个新窗口，并打开一个新布局，放入当前 panel
     * @param {string} name
     */
    open (name) {
        if (panel.focus(name)) {
            return;
        }

        let info = panel.queryInfo(name);
        // panel 没有注册
        if (!info) {
            console.log(`Panel[${name}] is not registered yet`);
            return;
        }
        let userData = info.userData || {};
        win.open(subHTML, {
            width: userData.width,
            height: userData.height,
        }, {
            layout: {
                version: 1,
                'min-width': userData['min-width'],
                'min-height': userData['min-height'],
                layout: {
                    percent: 1,
                    panels: [name],
                }
            }
        });
    }

    /**
     * 关闭已经注册的指定 panel
     * @param {string} name
     */
    close (name) {
        ipc.broadcast('editor-lib-panel:close', name);
    }
};

module.exports = new Panel();

ipc.on(`editor-lib-panel:open`, (event, name) => {
    module.exports.open(name);
});

ipc.on(`editor-lib-panel:close`, (event, name) => {
    module.exports.close(name);
});
