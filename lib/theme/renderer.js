'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');
const uiKit = require('./../ui-kit');
const dock = require('@editor/dock');
const panel = require('@editor/panel');
const fs = require('fs');
const ps = require('path');
const util = require('util');

const readDirAsync = util.promisify(fs.readdir);
const fsState = util.promisify(fs.stat);

/**
 * 皮肤管理器
 * 
 * 根据传入的文件夹，查找内部的 css 文件
 * 按文件名注入到指定的 shadowDOM 内
 */
class Theme extends EventEmitter {

    constructor() {
        super();
        //启动后查询一次当前所使用的皮肤路径
        ipc.send('editor3d-lib-theme:get').callback((error, stylePath) => {
            this.stylePath = stylePath;
            updateStyle(stylePath);
        });
    }

    /**
     * 使用某个皮肤包
     * @param {string} stylePath 皮肤文件夹路径
     */
    use(stylePath) {
        ipc.send('editor3d-lib-theme:use', stylePath);
    }

};

module.exports = new Theme();

// 监听广播消息
ipc.on('editor3d-lib-theme:change', (event, stylePath) => {
    updateStyle(stylePath);
});

/**
 * 根据皮肤路径处理文件夹内文件,更新皮肤
 * @param {string} stylePath 皮肤文件夹路径
 */
async function updateStyle(stylePath) {
    let fileNames = await readDirAsync(stylePath);
    for (let fileName of fileNames) {
        let fileDir = ps.join(stylePath, fileName);
        let status = await fsState(fileDir);
        if (status.isFile()) {//判断是文件
            //存储css文件路径
            if (ps.extname(fileName) === '.css') {
                let fileSortName = fileName.slice(0, -4);
                setUiStyle(fileSortName, fileDir);
            }
        } else if (status.isDirectory()) {//判断是
            updateStyle(fileDir);
        }

    }
}

/**
 * 根据文件名将样式地址注入对应的组件
 * @param {string} fileSortName 文件名称
 * @param {string} fileDir 文件所在的文件夹路径
 */
function setUiStyle(fileSortName, fileDir) {
    // console.log(fileDir);
    switch (fileSortName) {
        case 'layout':
            dock.importStyle(fileDir);
            break;
        case 'button':
            uiKit.Button.importStyle(fileDir);
            break;
        case 'num-input':
            uiKit.NumInput.importStyle(fileDir);
            break;
        case 'input':
            uiKit.Input.importStyle(fileDir);
            break;
        case 'color':
            uiKit.Color.importStyle(fileDir);
            break;
        case 'color-picker':
            uiKit.ColorPicker.importStyle(fileDir);
            break;
        case 'slider':
            uiKit.Slider.importStyle(fileDir);
            break;
        case 'section':
            uiKit.Section.importStyle(fileDir);
            break;
        case 'option':
            uiKit.Option.importStyle(fileDir);
            break;    
        case 'select':
            uiKit.Select.importStyle(fileDir);
            break;
        case 'checkbox':
            uiKit.Checkbox.importStyle(fileDir);
            break;
        case 'panel':
            panel.importStyle(fileDir);
            break;
    }
}