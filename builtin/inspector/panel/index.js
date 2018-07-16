'use strict';

const fs = require('fs');

module.exports = {

    style: fs.readFileSync(__dirname + '/style/index.css'),

    template: fs.readFileSync(__dirname + '/template/index.html'),

    $: {
        loading: '.loading',
    },

    messages: {
        'scene:ready' () {
            this.$.loading.hidden = true;
        },

        'scene:close' () {
            this.$.loading.hidden = false;
        },
    },

    async ready () {
        let isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');
        this.$.loading.hidden = isReady;
    },

    beforeClose () {},
    close () {},
};