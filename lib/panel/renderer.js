'use strict';

const ipc = require('@base/electron-base-ipc');
const panel = require('@editor/panel');

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
