'use stirct';

const fs = require('fs');
const fse = require('fs-extra');
const ps = require('path');

const setting = require('@editor/setting');
const windows = require('@base/electron-windows');

const file = ps.join(setting.PATH.HOME, 'editor/window.json');
const mainHTML = ps.join(__dirname, '../../windows/main.html');

/**
 * 保存 windows 的 dump 数据
 */
let save = function () {
    let root = process.cwd();
    let json = windows.dump();

    // 将绝对路径换成相对路径
    let array = json.windows;
    array.forEach((win) => {
        win.url = ps.relative(root, win.url);
    });

    fse.outputJSONSync(file, json);
}

// windows 变化的时候需要记录
windows.on('change', save);
windows.on('close', save);

class Windows {

    /**
     * 忽略缓存数据重新打开一个编辑器窗口
     */
    open () {
        windows.open(mainHTML, {
            center: true,
            width: 400,
            height: 320,
        }, {});
    }

    /**
     * 恢复上次的窗口状态
     */
    restore () {
        if (!fs.existsSync(file)) {
            this.open();
            return;
        }

        let root = process.cwd();
        let json = fse.readJSONSync(file);
        // 将相对路径换成绝对路径
        let array = json.windows;
        array.forEach((win) => {
            win.url = ps.join(root, win.url);
        });
        windows.restore(json);
    }
};

module.exports = new Windows();
