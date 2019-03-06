'use strict';
const ipc = require('@base/electron-base-ipc');
const fse = require('fs-extra');
class Windows {
    /**
     *
     * 更新窗口的主题样式
     * @param {*} path
     * @memberof Windows
     */
    alterTheme(path) {
        ipc.send('editor3d-lib-window:use-color', path);
    }
}

module.exports = new Windows();

// 应用配色
let applyColor = (path) => {
    const colorConfig = fse.readJsonSync(path);
    Object.keys(colorConfig).forEach((key) => {
        document.documentElement.style.setProperty(key, colorConfig[key]);
    });
};

// 监听广播消息
ipc.on('editor3d-lib-window:use-color', (event, path) => {
    applyColor(path);
});
