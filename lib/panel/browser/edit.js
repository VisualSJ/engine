'use strict';

const panelManager = require('@editor/panel');
const focusManager = require('./focus');
const ipc = require('@base/electron-base-ipc');
/**
 * 撤销
 * 将动作以消息的形式发送给当前的 panel
 * 并且根据 package.json 内定义的 undo 字段进行自动转发
 */
function undo() {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }
    const panels = panelManager.getPanelsFromWindow(focusWindow);
    const focusPanel = panelManager.getFocusPanel();
    const name = focusPanel.current || focusPanel.last;

    if (panels.indexOf(name) === -1) {
        return;
    }
    panelManager.send(name, 'undo');
    const info = panelManager.queryInfo(name);
    if (!info || !info.userData.redirect || !info.userData.redirect.undo) {
        return;
    }
    panelManager.send(info.userData.redirect.undo, 'undo');
}

/**
 * 重做
 * 将动作以消息的形式发送给当前的 panel
 * 并且根据 package.json 内定义的 undo 字段进行自动转发
 */
function redo() {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }
    const panels = panelManager.getPanelsFromWindow(focusWindow);
    const focusPanel = panelManager.getFocusPanel();
    const name = focusPanel.current || focusPanel.last;

    if (panels.indexOf(name) === -1) {
        return;
    }
    panelManager.send(name, 'redo');
    const info = panelManager.queryInfo(name);
    if (!info || !info.userData.redirect || !info.userData.redirect.redo) {
        return;
    }
    panelManager.send(info.userData.redirect.redo, 'redo');
}

/**
 * 发送复制前的校验
 * 是否有 window.getSelection() 值
 */
function copy() {
    ipc.broadcast('editor-lib-panel:check-copy');
}

/**
 * 接收复制校验后的结果再做处理
 */
ipc.on(`editor-lib-panel:copy`, (event, text) => {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }

    if (text) {
        // 使用原生方式
        focusWindow.webContents.copy();
    } else {
        const panels = panelManager.getPanelsFromWindow(focusWindow);
        const focusPanel = panelManager.getFocusPanel();
        const name = focusPanel.current || focusPanel.last;
        if (panels.indexOf(name) !== -1) {
            // 触发面板行为
            panelManager.send(name, 'copy');
        }
    }
});

/**
 * 发送裁切前的校验
 * 是否有 window.getSelection() 值
 */
function cut() {
    ipc.broadcast('editor-lib-panel:check-cut');
}

/**
 * 接收复制校验后的结果再做处理
 */
ipc.on(`editor-lib-panel:cut`, (event, text) => {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }

    if (text) {
        // 使用原生方式
        focusWindow.webContents.cut();
    } else {
        const panels = panelManager.getPanelsFromWindow(focusWindow);
        const focusPanel = panelManager.getFocusPanel();
        const name = focusPanel.current || focusPanel.last;
        if (panels.indexOf(name) !== -1) {
            // 触发面板行为
            panelManager.send(name, 'cut');
        }
    }
});

/**
 * 发送粘贴前的校验
 * 焦点是否有落在 input, textarea 元素上
 */
function paste() {
    ipc.broadcast('editor-lib-panel:check-paste');
}

/**
 * 接收粘贴校验后的结果再做处理
 */
ipc.on(`editor-lib-panel:paste`, (event, isFocusOnInput) => {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }

    if (isFocusOnInput) {
        // 使用原生方式
        focusWindow.webContents.paste();
    } else {
        const panels = panelManager.getPanelsFromWindow(focusWindow);
        const focusPanel = panelManager.getFocusPanel();
        const name = focusPanel.current || focusPanel.last;
        if (panels.indexOf(name) !== -1) {
            // 触发面板行为
            panelManager.send(name, 'paste');
        }
    }
});

exports.undo = undo;
exports.redo = redo;
exports.copy = copy;
exports.cut = cut;
exports.paste = paste;
