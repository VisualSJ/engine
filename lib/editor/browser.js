'use strict';

const ps = require('path');
const fse = require('fs-extra');
const setting = require('@editor/setting');

// 在 logger 启动前打印相应的启动数据
console.log('Arguments:');
Object.keys(setting.args).forEach((key) => {
    console.log(`  ${key}: ${setting.args[key]}`);
});
console.log(' ');

exports.Theme = require('../theme');
// 本地化翻译组件需要先加载，其他组件才能够获取数据
exports.I18n = require('../i18n');
// menu 需要初始化主菜单，需要在其他用到菜单的组件之前加载
exports.Menu = require('../menu');
exports.Dialog = require('../dialog');
exports.Package = require('../package');
exports.Layout = require('../layout');
exports.Panel = require('../panel');
exports.Ipc = require('../ipc');
exports.UI = require('../ui-kit');
exports.Logger = require('../logger');
exports.Profile = require('../profile');
exports.History = require('../history');

exports.dev = setting.dev;

// 如果项目文件夹不存在，则创建
fse.ensureDirSync(setting.PATH.PROJECT);

// 如果 package.json 不存在，则创建
let json = ps.join(setting.PATH.PROJECT, 'package.json');
if (!fse.existsSync(json)) {
    fse.writeJSONSync(json, {
        version: '1.0.0', type: '3d',
    }, {
        spaces: 2,
    });
}

// 获取 package.json 内的数据
let project = fse.readJSONSync(ps.join(setting.PATH.PROJECT, 'package.json'));

exports.Project = {
    get path() {
        return setting.PATH.PROJECT;
    },
    get type () {
        return project.type;
    },
};

exports.App = {
    get home() {
        return setting.PATH.HOME;
    },
    get path() {
        return setting.PATH.APP;
    },
};
