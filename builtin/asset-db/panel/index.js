'use strict';

const electron = require('electron');

module.exports = {
    template: '<h2>Asset DB</h2>',

    beforeClose () {
        let code = electron.remote.dialog.showMessageBox({
            title: '询问',
            message: '是否关闭 Asset DB Panel？',
            buttons: ['是', '否'],
        });
        return code === 1 ? false : true;
    },
};