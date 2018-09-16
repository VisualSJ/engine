'use strict';

const  { dialog , BrowserWindow} = require('electron');
const { handleOptions , getModalWin} = require('./utils');
const ipc = require('@base/electron-base-ipc');

class Dialog {

    /**
     * 打开文件
     * @param {Object}} options
     */
    openFiles(options = {}, win) {
        options.type = 'openFiles';
        let config = handleOptions(options);
        let window = getModalWin(win);
        dialog.showOpenDialog(window, config, (filePaths) => {
            typeof config.onOk === 'function' && config.onOk(filePaths);
        });
    }

    /**
     * 打开文件夹
     * @param {Object}} options
     */
    openDirectory(options = {}, win) {
        options.type = 'openDirectory';
        let config = handleOptions(options);
        let window = getModalWin(win);
        dialog.showOpenDialog(window, (filePaths) => {
            typeof config.onOk === 'function' && config.onOk(filePaths);
        });
    }

    /**
     * 保存文件
     * @param {Object}} options
     */
    saveFiles(options = {}, win) {
        options.type = 'saveFiles';
        let config = handleOptions(options);
        let window = getModalWin(win);
        dialog.showSaveDialog(window, config, (filePaths) => {
            typeof config.onOk === 'function' && config.onOk(filePaths);
        });
    }

    /**
     * 打开信息弹框
     * @param {Object}} options
     */
    show(options = {}, win) {
        if (arguments[0] == null) {
            options = {};
        }
        if (!options.type) {
            options.type = 'info';
        }
        console.log(options.type);
        let config = handleOptions(options);
        let window = getModalWin(win);
        dialog.showMessageBox(window, config, (response) => {
            if (response === 0 && config.onOk) {
                typeof config.onOk === 'function' && config.onOk();
            } else if (response === 1 && config.onCancel) {
                typeof config.onCancel === 'function' && config.onCancel();
            } else {
                typeof config.callback === 'function' && config.callback();
            }
        });
    }
}

module.exports = new Dialog();

ipc.on('editor3d-lib-dialog:show', (event, args) => {
    module.exports.show(args);
});

ipc.on('editor3d-lib-dialog:saveFiles', (event, args) => {
    module.exports.saveFiles(args);
});

ipc.on('editor3d-lib-dialog:openDirectory', (event, args) => {
    module.exports.openDirectory(args);
});

ipc.on('editor3d-lib-dialog:openFiles', (event, args) => {
    module.exports.openFiles(args);
});
