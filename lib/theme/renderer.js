'use strict';

const { EventEmitter } = require('events');
const { readdirSync, statSync, existsSync } = require('fs');
const { basename, join } = require('path');

const ipc = require('@base/electron-base-ipc');
const dock = require('@editor/dock');
const panel = require('@editor/panel');

const uiKit = require('./../ui-kit');

/**
 * 皮肤管理器
 * 
 * 根据传入的文件夹，查找内部的 css 文件
 * 按文件名注入到指定的 shadowDOM 内
 */
class Theme extends EventEmitter {

    constructor() {
        super();
    }

    /**
     * 使用某个皮肤包
     * @param {string} path 皮肤文件夹路径
     */
    use(path) {
        ipc.send('editor3d-lib-theme:use', path);
    }

};

module.exports = new Theme();

//启动后查询一次当前所使用的皮肤路径
ipc.send('editor3d-lib-theme:get').callback((error, path) => {
    walkDir(path);
});

// 监听广播消息
ipc.on('editor3d-lib-theme:change', (event, path) => {
    walkDir(path);
});

/**
 * 根据皮肤路径处理文件夹内文件，更新皮肤
 * 使用同步接口，因为异步接口会导致页面加载成功后，样式还未加载
 * @param {string} dirname 皮肤文件夹路径
 */
function walkDir(dirname) {
    if (!existsSync(dirname)) {
        return;
    }

    let names = readdirSync(dirname);
    names.forEach(async (name) => {
        let file = join(dirname, name);

        let stat = statSync(file);
        if (stat.isDirectory()) {
            walkDir(file);
            return;
        }
        applyStyle(file)
    });
};

/**
 * 应用样式
 * @param {*} file 
 */
let applyStyle = function(file) {
    let name = basename(file);
    switch (name) {
        case 'layout.css':
            dock.importStyle(file);
            break;
        case 'panel.css':
            panel.importStyle(file);
            break;
        case 'button.css':
            uiKit.Button.importStyle(file);
            break;
        case 'num-input.css':
            uiKit.NumInput.importStyle(file);
            break;
        case 'input.css':
            uiKit.Input.importStyle(file);
            break;
        case 'color.css':
            uiKit.Color.importStyle(file);
            break;
        case 'color-picker.css':
            uiKit.ColorPicker.importStyle(file);
            break;
        case 'slider.css':
            uiKit.Slider.importStyle(file);
            break;
        case 'section.css':
            uiKit.Section.importStyle(file);
            break;
        case 'select.css':
            uiKit.Select.importStyle(file);
            break;
        case 'checkbox.css':
            uiKit.Checkbox.importStyle(file);
            break;
        case 'drag-object.css':
            uiKit.DragObject.importStyle(file);
            break;  
    }
};
