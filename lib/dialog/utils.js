const { defaultConfig , filterConfig } = require('./config');
const {BrowserWindow} = require('electron');
/**
 * 处理options为有效数据
 * @param {Object} options
 */
const handleOptions = (options) => {
    if (Object.keys(options).length === 0) {
        console.log('未传入任何弹框配置参数');
    }
    let config = JSON.parse(JSON.stringify(defaultConfig[options.type]));
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
        case 'openFiles':
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
};

const getModalWin = (win) => {
    if (win && win.isPrototypeOf(BrowserWindow)) {
        return win;
    }
    return BrowserWindow.getFocusedWindow();
};

exports.handleOptions = handleOptions;
exports.getModalWin = getModalWin;
