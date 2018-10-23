'use stirct';

const fs = require('fs');
const fse = require('fs-extra');
const ps = require('path');
const ipc = require('@base/electron-base-ipc');

const setting = require('@editor/setting');
const windows = require('@base/electron-windows');
const worker = require('@base/electron-worker');

// 存放布局数据的 json 路径
const file = ps.join(setting.PATH.HOME, 'editor/window.json');

// 主页的地址
const mainHTML = ps.join(__dirname, './static/main.html');

/**
 * 保存 windows 的 dump 数据
 */
let save = function() {
    let json = windows.dump();

    // 将绝对路径换成页面文件名
    let array = json.windows;
    array.forEach((win) => {
        win.url = ps.basename(win.url);
    });

    try {
        fse.outputJSONSync(file, json);
    } catch (error) {

    }
};

// windows 变化的时候需要记录
windows.on('change', save);
windows.on('close', save);

windows.on('clear', () => {
    worker.clear();
});

class Windows {

    /**
     * 忽略缓存数据重新打开一个编辑器窗口
     */
    open() {
        windows.open(mainHTML, {
            center: true,
            width: 400,
            height: 320,
        }, {});
    }

    /**
     * 恢复上次的窗口状态
     */
    restore() {
        if (!fs.existsSync(file)) {
            this.open();
            return;
        }

        let json;
        try {
            json = fse.readJSONSync(file);
        } catch (error) {
            console.warn(`Recovery window failed: ${file} read error.`);
            console.warn(error);
            this.open();
            return;
        }

        // 将文件名换成绝对路径
        let array = json.windows;
        array.forEach((win) => {
            win.url = ps.join(__dirname, 'static', ps.basename(win.url));
        });
        windows.restore(json);
    }

    /**
     * 更新窗口的主题样式
     * @param {*} path
     * @memberof Windows
     */
    alterTheme(path) {
        ipc.broadcast('editor3d-lib-window:use-color', path);
    }
}

module.exports = new Windows();

ipc.on('editor3d-lib-window:use-color', (event, path) => {
    module.exports.alterTheme(path);
});
