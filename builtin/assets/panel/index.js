'use strict';

const fs = require('fs');

module.exports = {

    style: fs.readFileSync(__dirname + '/style/index.css'),

    template: fs.readFileSync(__dirname + '/template/index.html'),

    messages: {
        'asset-db:ready' () {
            this.$.loading.hidden = true;
        },
    },

    $: {
        loading: '.loading',
    },

    async ready () {
        let isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
        this.$.loading.hidden = isReady;
    },

    beforeClose () {},
    close () {},
};