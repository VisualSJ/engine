'use strict';

const { BrowserWindow, webContents } = require('electron');
const panelManager = require('@editor/panel');
const ipc = require('@base/electron-base-ipc');

/**
 * 撤销
 * 将动作以消息的形式发送给当前的 panel
 * 并且根据 package.json 内定义的 undo 字段进行自动转发
 */
function undo() {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!focusedWindow) {
        const focusedWebContents = webContents.getFocusedWebContents();
        focusedWebContents && focusedWebContents.undo();
        return;
    }

    if (focusedWindow.devToolsWebContents && focusedWindow.devToolsWebContents.isFocused()) {
        focusedWindow.devToolsWebContents.undo();
        return;
    }

    ipc
    .sendToWin(focusedWindow, 'editor-lib-panel:query-active-element-tag')
    .callback((error, tag) => {
        if (error || ['input', 'textarea'].includes(tag)) {
            focusedWindow.webContents.undo(); // win32 平台上不需要这个操作，但 mac 上需要
            return;
        }
        const panels = panelManager.getPanelsFromWindow(focusedWindow);
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
    })
    .timeout(500);

}

/**
 * 重做
 * 将动作以消息的形式发送给当前的 panel
 * 并且根据 package.json 内定义的 undo 字段进行自动转发
 */
function redo() {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!focusedWindow) {
        const focusedWebContents = webContents.getFocusedWebContents();
        focusedWebContents && focusedWebContents.redo();
        return;
    }

    if (focusedWindow.devToolsWebContents && focusedWindow.devToolsWebContents.isFocused()) {
        focusedWindow.devToolsWebContents.redo();
        return;
    }

    ipc
    .sendToWin(focusedWindow, 'editor-lib-panel:query-active-element-tag')
    .callback((error, tag) => {
        if (error || ['input', 'textarea'].includes(tag)) {
            focusedWindow.webContents.redo(); // win32 平台上不需要这个操作，但 mac 上需要
            return;
        }
        const panels = panelManager.getPanelsFromWindow(focusedWindow);
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
    })
    .timeout(500);
}

/**
 * 发送复制前的校验
 * 是否有 window.getSelection() 值
 */
function copy() {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!focusedWindow) {
        const focusedWebContents = webContents.getFocusedWebContents();
        focusedWebContents && focusedWebContents.copy();
        return;
    }

    if (focusedWindow.devToolsWebContents && focusedWindow.devToolsWebContents.isFocused()) {
        focusedWindow.devToolsWebContents.copy();
        return;
    }

    ipc
        .sendToWin(focusedWindow, 'editor-lib-panel:query-selection-text')
        .callback((error, text) => {
            if (error || text) {
                focusedWindow.webContents.copy();
                return;
            }
            const panels = panelManager.getPanelsFromWindow(focusedWindow);
            const focusPanel = panelManager.getFocusPanel();
            const name = focusPanel.current || focusPanel.last;
            if (panels.indexOf(name) !== -1) {
                panelManager.send(name, 'copy');
            }
        })
        .timeout(500);
}

/**
 * 发送裁切前的校验
 * 是否有 window.getSelection() 值
 */
function cut() {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!focusedWindow) {
        const focusedWebContents = webContents.getFocusedWebContents();
        focusedWebContents && focusedWebContents.cut();
        return;
    }

    if (focusedWindow.devToolsWebContents && focusedWindow.devToolsWebContents.isFocused()) {
        focusedWindow.devToolsWebContents.cut();
        return;
    }

    ipc
        .sendToWin(focusedWindow, 'editor-lib-panel:query-selection-text')
        .callback((error, text) => {
            if (error || text) {
                focusedWindow.webContents.cut();
                return;
            }
            const panels = panelManager.getPanelsFromWindow(focusedWindow);
            const focusPanel = panelManager.getFocusPanel();
            const name = focusPanel.current || focusPanel.last;
            if (panels.indexOf(name) !== -1) {
                panelManager.send(name, 'cut');
            }
        })
        .timeout(500);
}

/**
 * 发送粘贴前的校验
 * 焦点是否有落在 input, textarea 元素上
 */
function paste() {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!focusedWindow) {
        const focusedWebContents = webContents.getFocusedWebContents();
        focusedWebContents && focusedWebContents.paste();
        return;
    }

    if (focusedWindow.devToolsWebContents && focusedWindow.devToolsWebContents.isFocused()) {
        focusedWindow.devToolsWebContents.paste();
        return;
    }

    ipc
        .sendToWin(focusedWindow, 'editor-lib-panel:query-active-element-tag')
        .callback((error, tag) => {
            if (error || ['input', 'textarea'].includes(tag)) {
                focusedWindow.webContents.paste();
                return;
            }
            const panels = panelManager.getPanelsFromWindow(focusedWindow);
            const focusPanel = panelManager.getFocusPanel();
            const name = focusPanel.current || focusPanel.last;
            if (panels.indexOf(name) !== -1) {
                panelManager.send(name, 'paste');
            }
        })
        .timeout(500);
}

exports.undo = undo;
exports.redo = redo;
exports.copy = copy;
exports.cut = cut;
exports.paste = paste;
