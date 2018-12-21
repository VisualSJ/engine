'use strict';

const ipc = require('@base/electron-base-ipc');
const panel = require('@editor/panel');

class Panel {

    /**
     * 打开已经注册的指定 panel
     * @param {string} name
     */
    open (name) {
        ipc.send(`editor-lib-panel:open`, name);
    }

    /**
     * 关闭已经注册的指定 panel
     * @param {string} name
     */
    close (name) {
        ipc.send(`editor-lib-panel:close`, name);
    }
};

module.exports = new Panel();

ipc.on(`editor-lib-panel:close`, (event, name) => {
    let $panel = panel.query(name);
    if (!$panel) {
        return;
    }
    $panel.parentElement.$groups.removePanel(name);
});
