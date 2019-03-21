'use strict';

const i18n = require('@base/electron-i18n');
const menu = require('@base/electron-menu');

const packageManager = require('../../package');

const platform = require('../platform');
const utils = require('./utils');

module.exports = {

    add(path, options) {
        menu.add(path, options);
    },
    remove: menu.remove,
    get: menu.get,
    apply: menu.apply,
};

i18n.on('switch', () => {
    menu.clear();
    platform[process.platform]();

    const infos = packageManager.getPackages({
        enable: true,
    });

    infos.forEach((info) => {
        utils.registerMenu(info);
    });
});

// 应用对应平台的菜单
platform[process.platform]();

// 插件启动的时候，主动去获取 menu 配置，并注册到菜单栏上
packageManager.on('enable', (data) => {
    utils.registerMenu(data);
});

packageManager.on('disable', (data) => {
    utils.unregisterMenu(data);
});
