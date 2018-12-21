'use strict';

const menu = require('@base/electron-menu');

module.exports = {

    /**
     * 右键菜单
     * @param {Object} options
     *   {
     *     x: event.pageX,
     *     y: event.pageY,
     *     menu: [
     *       { label: 'test', click () {} },
     *       { type: 'separator', },
     *       { label: 'submenu', submenu: [ { label: 'test2', click () {} } ] },
     *     ]
     *   }
     */
    popup(options) {
        menu.popup(options);
    },
};
