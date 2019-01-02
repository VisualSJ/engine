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

ipc.on(`editor-lib-panel:close`, (event, name) => {
    let $panel = panel.query(name);
    if (!$panel) {
        return;
    }
    $panel.parentElement.$groups.removePanel(name);
});

/**
 * 接收来自顶层 edit 菜单复制前的检查
 */
ipc.on(`editor-lib-panel:check-copy`, (event, name) => {
    const text = window.getSelection().toString();
    // 回发结果
    ipc.send(`editor-lib-panel:copy`, text);
});

/**
 * 接收来自顶层 edit 菜单裁切前的检查
 */
ipc.on(`editor-lib-panel:check-cut`, (event, name) => {
    const text = window.getSelection().toString();
    // 回发结果
    ipc.send(`editor-lib-panel:cut`, text);
});

/**
 * 接收来自顶层 edit 菜单粘贴前的检查
 */
ipc.on(`editor-lib-panel:check-paste`, (event, name) => {
    let isFocusOnInput = false;
    const element = getShadowRootActiveElement(document.activeElement);
    if (element && ['input', 'textarea'].includes(element.tagName.toLowerCase())) {
        isFocusOnInput = true;
    }

    // 回发结果
    ipc.send(`editor-lib-panel:paste`, isFocusOnInput);
});

function getShadowRootActiveElement(element) {
    if (element && element.shadowRoot) {
        return getShadowRootActiveElement(element.shadowRoot.activeElement);
    }
    return element;
}
