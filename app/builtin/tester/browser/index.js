'use strict';

const { BrowserWindow } = require('electron');

const ipc = require('@base/electron-base-ipc');
const panelManager = require('@editor/panel');
const packageManager = require('@editor/package');

exports.messages = {
    /**
     * 打开面板
     */
    open() {
        Editor.Panel.open('tester');
    },

    /**
     * 转发某条消息到 panel 所在的窗口
     * @param {string} panel
     * @param  {...any} args
     */
    'forwarding-to-window'(panel, ...args) {
        const id = panelManager.getWindow(panel);
        if (!id) {
            throw new Error(`The panel doesn't exist: ${panel}`);
        }
        const win = BrowserWindow.fromId(id);
        return new Promise((resolve, reject) => {
            ipc.sendToWin(win, 'package-tester:message', panel, ...args).callback((error, data) => {
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
        });
    },
};

exports.load = function load() {

};

exports.unload = function unload() {

};
