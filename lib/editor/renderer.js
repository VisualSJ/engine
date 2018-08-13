'use strict';

const setting = require('@editor/setting');

exports.Theme = require('../theme');
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
exports.History = require('../history');

exports.dev = setting.dev;

exports.Project = {
    get path () {
        return setting.PATH.PROJECT;
    },
};

exports.App = {
    get home () {
        return setting.PATH.HOME;
    },
    get path () {
        return setting.PATH.APP;
    },
};