'use strict';

const ps = require('path'); // path system
const  { dialog } = require('electron');
const ipc = require('@base/electron-base-ipc');
const windows = require('@base/electron-windows');
const { defaultConfig , filterConfig } = require('./config');
const setting = require('@editor/setting');

class Dialog {

    constructor() {
        this.dialog = dialog;
    }

    /**
     * 打开文件
     * @param {Object}} options
     */
    openFiles(options) {
        options.type = 'openfiles';
        let config = this.handleOptions(options);
        this.dialog.showOpenDialog(config, (filePaths) => {
            typeof config.onOk === 'function' && config.onOk(filePaths);
        });
    }

    /**
     * 打开文件夹
     * @param {Object}} options
     */
    openDirectory(options) {
        options.type = 'openDirectory';
        let config = this.handleOptions(options);
        this.dialog.showOpenDialog(config, (filePaths) => {
            typeof config.onOk === 'function' && config.onOk(filePaths);
        });
    }

    /**
     * 保存文件
     * @param {Object}} options
     */
    saveFiles(options) {
        options.type = 'saveFiles';
        let config = this.handleOptions(options);
        this.dialog.showSaveDialog(config, (filePaths) => {
            typeof config.onOk === 'function' && config.onOk(filePaths);
        });
    }

    /**
     * 打开信息弹框
     * @param {Object}} options
     */
    show(options) {
        options.type = options.type || 'info';
        let config = this.handleOptions(options);
        this.dialog.showMessageBox(config, (response) => {
            if (response === 0 && config.onOk) {
                typeof config.onOk === 'function' && config.onOk();
            } else if (response === 1 && config.onCancel) {
                typeof config.onCancel === 'function' && config.onCancel();
            } else {
                typeof config.callback === 'function' && config.callback();
            }
        });
    }

    /**
     * 处理options为有效数据
     * @param {Object} options
     */
    handleOptions(options) {
        let config = {
            title: '弹框配置信息有误'
        };
        config = defaultConfig[options.type];
        for (let name of Object.keys(options)) {
            if (config[name] !== undefined && config[name] !== options[name]) {
                config[name] = options[name];
            }
        }
        switch (options.type) {
            case 'info':
            case 'error':
            case 'warning':
                if (!options.buttons) {
                    if (options.cancelText || options.onCancel) {
                        config.buttons = [options.okText || config.okText];
                        let cancelText = options.cancelText || config.cancelText;
                        config.buttons.push(cancelText);
                        break;
                    }
                    if (!options.okText) {
                        // config.buttons = [options.okText || config.okText];
                        break;
                    }
                    config.buttons = [];
                    config.buttons.push(options.okText);
                } else {
                    config.buttons[0] = options.okText || config.buttons[0];
                    config.buttons[1] = options.cancelText || config.buttons[1];
                }
                break;
            case 'openfiles':
            case 'saveFiles':
                if (typeof options.filters === 'string') {
                    config.filters = [];
                    for (let item of options.filters.split(',')) {
                        if (!filterConfig[item]) {
                            break;
                        }
                        config.filters.push(filterConfig[item]);
                    }
                }
                break;
        }
        return config;
    }
}

module.exports = new Dialog();
