'use strict';

const { join } = require('path');
const Package = require('../../../../package');

const name2module = {};

/**
 * 将插件内定义的 windows 模块附加在当前窗口上
 * @param {*} data 
 */
function attach(data) {
    if (!data.enable || !data.info.windows) {
        return;
    }
    try {
        name2module[data.name] = require(join(data.path, data.info.windows));
        name2module[data.name].load();
    } catch (error) {
        console.error(`Plug-in(${data.info.name}) execution error: [windows].load code failed to execute.`);
        console.error(error);
    }
}

/**
 * 将插件内定义的 windows 模块从当前窗口移除
 * @param {*} data 
 */
function detach(data) {
    if (!name2module[data.name]) {
        return;
    }
    try {
        const mod = name2module[data.name];
        mod.unload();
    } catch (error) {
        console.error(`Plug-in(${data.info.name}) execution error: [windows].unload code failed to execute.`);
        console.error(error);
    } finally {
        delete name2module[data.name]
    }
}

// 循环当前已经打开的插件
const list = Package.getPackages();
list.forEach(attach);

// 监听正在打开的插件
Package.on('enable', attach);
Package.on('disable', detach);