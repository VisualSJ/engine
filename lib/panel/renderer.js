'use strict';

const ipc = require('@base/electron-base-ipc');
const panel = require('@editor/panel');
const Mousetrap = require('mousetrap');

class Panel {

    /**
     * 打开已经注册的指定 panel
     * @param {string} name
     */
    open(name) {
        ipc.send(`editor-lib-panel:open`, name);
    }

    /**
     * 关闭已经注册的指定 panel
     * @param {string} name
     */
    close(name) {
        ipc.send(`editor-lib-panel:close`, name);
    }
}

module.exports = new Panel();

/**
 * 住进程关闭某个面板
 */
ipc.on(`editor-lib-panel:close`, (event, name) => {
    let $panel = panel.query(name);
    if (!$panel) {
        return;
    }
    $panel.parentElement.$groups.removePanel(name);
});

/**
 * 查询窗口当前选中的文本
 */
ipc.on(`editor-lib-panel:query-selection-text`, (event) => {
    const text = window.getSelection().toString();
    event.reply(null, text);
});

/**
 * 接收来自顶层 edit 菜单粘贴前的检查
 */
ipc.on(`editor-lib-panel:query-active-element-tag`, (event, name) => {
    function getShadowRootActiveElement(element) {
        if (element && element.shadowRoot) {
            return getShadowRootActiveElement(element.shadowRoot.activeElement);
        }
        return element;
    }
    const element = getShadowRootActiveElement(document.activeElement);
    event.reply(null, element ? element.tagName.toLowerCase() : '');
});

// Hack 兼容处理 window 平台上的 undo redo 自上而下分发
if (process.platform === 'win32') {
    let mousetrap = new Mousetrap(document);

    mousetrap.bind('ctrl+z', (e) => {
        ipc.send('editor-lib-panel:win32-undo');
        return false;
    });
    mousetrap.bind('ctrl+shift+z', (e) => {
        ipc.send('editor-lib-panel:win32-redo');
        return false;
    });
    mousetrap.bind('ctrl+y', (e) => {
        ipc.send('editor-lib-panel:win32-redo');
        return false;
    });

    mousetrap.bind('ctrl+c', (e) => {
        ipc.send('editor-lib-panel:win32-copy');
        return false;
    });
    mousetrap.bind('ctrl+v', (e) => {
        ipc.send('editor-lib-panel:win32-paste');
        return false;
    });
    mousetrap.bind('ctrl+x', (e) => {
        ipc.send('editor-lib-panel:win32-cut');
        return false;
    });
}
