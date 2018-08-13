'use strict';

const { EventEmitter } = require('events');
const ipc = require('@base/electron-base-ipc');

/**
 * 皮肤管理器
 * 
 * 根据传入的文件夹，查找内部的 css 文件
 * 按文件名注入到指定的 shadowDOM 内
 */
class Theme extends EventEmitter {

    /**
     * 使用某个皮肤包
     * @param {string} dirname 皮肤文件所在的文件夹
     */
    use (dirname) {
        // todo
    }
};

module.exports = new Theme();

// renderer 进程调用 use 接口
ipc.on('editor3d-lib-theme:use', (event, dirname) => {
    module.exports.use(dirname);
});