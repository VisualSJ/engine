'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');
const ps = require('path');

/**
 * 皮肤管理器
 * 
 * 根据传入的文件夹，查找内部的 css 文件
 * 按文件名注入到指定的 shadowDOM 内
 */
class Theme extends EventEmitter {

    constructor() {
        super();
        this.stylePath = ps.join(__dirname + '/style/default');
        // 监听render进程的请求皮肤路径
        ipc.on('editor3d-lib-theme:get', (event) => {
            event.reply(null, this.stylePath);
        })
    }

    /**
     * 使用某个皮肤包
     * @param {string} stylePath 皮肤文件所在的文件夹
     */
    use(stylePath) {
        this.stylePath = stylePath;
        //更换主题皮肤路径，通知窗口
        ipc.broadcast('editor3d-lib-theme:use', this.stylePath);
    }
};

module.exports = new Theme();

ipc.on('editor3d-lib-theme:use', (event, stylePath) => {
    module.exports.use(stylePath)
});

//主动调用theme传入主题皮肤路径
module.exports.use(ps.join(__dirname + '/style/default'));