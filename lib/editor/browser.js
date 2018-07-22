'use strict';

const fse = require('fs-extra');
const setting = require('@editor/setting');

// 在 logger 启动前打印相应的启动数据
console.log('Arguments:');
Object.keys(setting.args).forEach((key) => {
    console.log(`  ${key}: ${setting.args[key]}`);
});
console.log(' ');

// 本地化翻译组件需要先加载，其他组件才能够获取数据
exports.I18n = require('../i18n');
// menu 需要初始化主菜单，需要在其他用到菜单的组件之前加载
exports.Menu = require('../menu');
exports.Package = require('../package');
exports.Layout = require('../layout');
exports.Panel = require('../panel');
exports.Ipc = require('../ipc');
exports.UI = require('../ui-kit');
exports.Logger = require('../logger');
exports.Profile = require('../profile');

exports.dev = setting.dev;

exports.Project = {
    path: setting.PATH.PROJECT,
};

exports.App = {
    home: setting.PATH.HOME,
    path: setting.PATH.APP,
};

// 如果项目文件夹不存在，则创建
fse.ensureDirSync(setting.PATH.PROJECT);
