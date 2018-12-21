'use strict';

const panelManager = require('@editor/panel');

const focusManager = require('./focus');

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
 * 复制
 * 将动作发给当前的面板，并触发默认事件
 */
function copy() {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }
    const panels = panelManager.getPanelsFromWindow(focusWindow);
    const focusPanel = panelManager.getFocusPanel();
    const name = focusPanel.current || focusPanel.last;
    if (panels.indexOf(name) !== -1) {
        panelManager.send(name, 'copy');
    }
    focusWindow.webContents.copy();
}

/**
 * 剪切
 * 将动作发给当前的面板，并触发默认事件
 */
function cut() {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }
    const panels = panelManager.getPanelsFromWindow(focusWindow);
    const focusPanel = panelManager.getFocusPanel();
    const name = focusPanel.current || focusPanel.last;
    if (panels.indexOf(name) !== -1) {
        panelManager.send(name, 'cut');
    }
    focusWindow.webContents.cut();
}

/**
 * 粘贴
 * 将动作发给当前的面板，并触发默认事件
 */
function paste() {
    const focusWindow = focusManager.window;
    if (!focusWindow) {
        return;
    }
    const panels = panelManager.getPanelsFromWindow(focusWindow);
    const focusPanel = panelManager.getFocusPanel();
    const name = focusPanel.current || focusPanel.last;
    if (panels.indexOf(name) !== -1) {
        panelManager.send(name, 'paste');
    }
    focusWindow.webContents.paste();
}

exports.undo = undo;
exports.redo = redo;
exports.copy = copy;
exports.cut = cut;
exports.paste = paste;
