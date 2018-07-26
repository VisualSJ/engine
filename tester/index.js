'use strict';

// 初始化 Editor
global.Editor  = require('../lib/editor');

const path = require('path');
const setting = require('@editor/setting');
const brwoser = require('./browser');

if (!setting.args.package) {
    throw 'There is no plug-in specified for testing. please use --package packageName.';
}

let name = setting.args.package;

// 启动测试窗口
brwoser.windows.tester(name);

// 启动插件窗口
brwoser.windows.package(name);

// 加载指定的插件
Editor.Package.load(path.join(__dirname, '../builtin', name));

// 加载测试插件的监听消息
brwoser.ipc.load(name);