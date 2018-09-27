'use strict';

const i18n = require('@base/electron-i18n');
const menu = require('@base/electron-menu');

const platform = require('./platform');

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
});
platform[process.platform]();
