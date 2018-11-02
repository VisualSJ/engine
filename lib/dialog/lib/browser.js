'use strict';

const ipc = require('@base/electron-base-ipc');
const  { dialog, BrowserWindow } = require('electron');

class Dialog {

    /**
     * 打开文件
     * @param {Object}} options
     */
    async openFile(options = {}, window = null) {
        const config = {
            defaultPath: options.root || null,
            properties: ['openFile'],
        };

        if (options.multi) {
            config.properties.push('multiSelections');
        }

        if (options.filters) {
            config.filters = options.filters;
        }

        return new Promise((resolve) => {
            dialog.showOpenDialog(window, config, (filePaths) => {
                resolve(filePaths);
            });
        });
    }

    /**
     * 打开文件夹
     * @param {Object}} options
     */
    async openDirectory(options = {}, window = null) {
        const config = {
            defaultPath: options.root || null,
            properties: ['openDirectory'],
        };

        if (options.multi) {
            config.properties.push('multiSelections');
        }
        if (options.title) {
            config.title = options.title;
        }
        return new Promise((resolve) => {
            dialog.showOpenDialog(window, config, (filePaths) => {
                resolve(filePaths);
            });
        });
    }

    /**
     * 保存文件
     * @param {Object}} options
     */
    async saveFile(options = {}, window = null) {
        const config = {
            defaultPath: options.root || null,
            properties: ['openFile'],
            buttonLabel: options.label || '保存',
        };

        if (options.filters) {
            config.filters = options.filters;
        }

        if (options.title) {
            config.title = options.title;
        }
        return new Promise((resolve) => {
            dialog.showSaveDialog(window, config, (filePaths) => {
                resolve(filePaths ? [filePaths] : []);
            });
        });
    }

    /**
     * 打开信息弹框
     * @param {Object}} options
     */
    async show(options = {}, window = null) {

        if (options.type === 'warn') {
            options.type = 'warning';
        }

        const config = {
            title: options.title || 'title',
            message: options.message || 'message',
            detail: options.detail || '',
            type: options.type || 'none',
            icon: options.icon || null,

            defaultId: options.default,
            cancelId: options.cancel,

            buttons: options.buttons || ['Ok', 'Cancel'],
        };

        return new Promise((resolve) => {
            dialog.showMessageBox(window, config, (button) => {
                resolve([button]);
            });
        });
    }
}

module.exports = new Dialog();

ipc.on('lib-dialog:call', async (event, func, options) => {
    try {
        const files = await module.exports[func](options, BrowserWindow.fromWebContents(event.sender));
        event.reply(null, files || []);
    } catch (error) {
        event.reply(error, []);
    }
});
