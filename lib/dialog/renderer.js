'use strict';

const ipc = require('@base/electron-base-ipc');
const dialogBrower = require('./browser');
const  { dialog } = require('electron').remote;

class Dialog {
    constructor() {
        // 传入渲染进程可调用的原生dialog对象
        dialogBrower.dialog = dialog;
    }

    /**
     * 打开文件
     * @param {Object}} options
     */
    openFiles(options) {
        dialogBrower.openFiles(options);
    }

    /**
     * 打开文件夹
     * @param {Object}} options
     */
    openDirectory(options) {
        dialogBrower.openDirectory(options);
    }

    /**
     * 保存文件
     * @param {Object}} options
     */
    saveFiles(options) {
        dialogBrower.saveFiles(options);
    }

    /**
     * 显示基础信息弹框
     * @param {Object}} options
     */
    show(options) {
        dialogBrower.show(options);
    }
}

module.exports = new Dialog();
