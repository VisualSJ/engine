'use strict';

const fs = require('fs');

let loadScene = function () {
    // init gizmo
    // init scene

    // 模拟加载延迟
    setTimeout(() => {
        Editor.Ipc.sendToAll('scene:ready');
        this.$.loading.hidden = true;
    }, 4000);
};

let closescene = function () {
    Editor.Ipc.sendToAll('scene:close');
    this.$.loading.hidden = false;
};

module.exports = {

    style: fs.readFileSync(__dirname + '/style/index.css'),

    template: fs.readFileSync(__dirname + '/template/index.html'),

    messages: {
        'asset-db:ready' () {
            loadScene.call(this);
        },
    },

    $: {
        loading: '.loading',
    },

    methods: {},

    async ready () {
        let isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
        if (isReady) {
            loadScene.call(this);
        }
    },

    beforeClose () {
        // debugger
    },

    close () {
        closescene.call(this);
    },
};