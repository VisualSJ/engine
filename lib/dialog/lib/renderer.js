'use strict';

const ipc = require('@base/electron-base-ipc');

class Dialog {

    /**
     * 打开文件
     * @param {Object}} options
     */
    async openFile(options = {}) {
        return new Promise((resolve, reject) => {
            ipc.send('editor-lib-dialog:call', 'openFile', options)
                .callback((error, files) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(files);
                });
        });
    }

    /**
     * 打开文件夹
     * @param {Object}} options
     */
    async openDirectory(options = {}) {
        return new Promise((resolve, reject) => {
            ipc.send('editor-lib-dialog:call', 'openDirectory', options)
                .callback((error, files) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(files);
                });
        });
    }

    /**
     * 保存文件
     * @param {Object}} options
     */
    async saveFile(options = {}) {
        return new Promise((resolve, reject) => {
            ipc.send('editor-lib-dialog:call', 'saveFile', options)
                .callback((error, files) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(files[0]);
                });
        });
    }

    /**
     * 打开信息弹框
     * @param {Object}} options
     */
    show(options = {}) {
        return new Promise((resolve, reject) => {
            ipc.send('editor-lib-dialog:call', 'show', options)
                .callback((error, files) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(files[0]);
                });
        });
    }
}

module.exports = new Dialog();
