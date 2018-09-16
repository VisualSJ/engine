'use strict';

const dialogBrower = require('./browser');
const ipc = require('@base/electron-base-ipc');

class Dialog {
    /**
     * 打开文件
     * @param {Object}} options
     */
    openFiles(options) {
        ipc.send('editor3d-lib-dialog:openFiles', options);
    }

    /**
     * 打开文件夹
     * @param {Object}} options
     */
    openDirectory(options) {
        ipc.send('editor3d-lib-dialog:openDirectory', options);
    }

    /**
     * 保存文件
     * @param {Object}} options
     */
    saveFiles(options) {
        ipc.send('editor3d-lib-dialog:saveFiles', options);
    }

    /**
     * 显示基础信息弹框
     * @param {Object}} options
     */
    show(options) {
        ipc.send('editor3d-lib-dialog:show', options);
    }
}

module.exports = new Dialog();
