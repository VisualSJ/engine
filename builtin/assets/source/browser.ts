'use strict';

module.exports = {

    messages: {
        open () {
            // 打开指定的 panel，this.name
            Editor.Panel.open('assets');
        },
    },

    async load () {},

    async unload () {},
};