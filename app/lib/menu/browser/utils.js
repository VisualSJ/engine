'use strict';

const { join } = require('path');

const packageManager = require('@editor/package');
const menuManager = require('@base/electron-menu');
const i18nManager = require('@base/electron-i18n');

/**
 * 注册一个插件内声明的菜单
 * @param {*} data
 */
function registerMenu(data) {
    const menu = data.info.menu;

    Object.keys(menu || {}).forEach((key) => {
        let options = menu[key];

        // 翻译 menu
        let items = key.split('/');
        items = items.map((item) => {
            if (!item.startsWith('i18n:')) {
                return item;
            }
            let str = item.substr(5);
            return i18nManager.translation(str) || str;
        });

        // 实际插入 menu
        menuManager.add(items.join('/'), {
            icon: options.icon ? join(data.path, options.icon) : undefined,
            accelerator: options.accelerator,
            group: options.group || 'default',
            click() {
                packageManager.send(data.name, options.message, ...(options.params || []));
            },
        });
    });
    menuManager.apply();
}

/**
 * 移除一个插件的 menu
 * @param {*} data
 */
function unregisterMenu(data) {
    const menu = data.info.menu;
    Object.keys(menu || {}).forEach((key) => {
        // 翻译 menu
        let items = key.split('/');
        items = items.map((item) => {
            if (!item.startsWith('i18n:')) {
                return item;
            }
            let str = item.substr(5);
            return i18nManager.translation(str) || str;
        });

        // 实际插入 menu
        menuManager.remove(items.join('/'));
    });
    menuManager.apply();
}

exports.registerMenu = registerMenu;
exports.unregisterMenu = unregisterMenu;
