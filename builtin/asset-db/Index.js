'use strict';

let isReady = false;

module.exports = {

    messages: {

        open () {
            Editor.Panel.open(this.name);
        },

        /**
         * 监听消息
         * ${action}-${method}
         * 
         * 场景主要引擎处理逻辑都在 panel，主进程只是负责数据转发
         */

        // 查询是否准备完成
        'query-is-ready' (event) {
            event.reply(null, isReady);
        },


    },

    async load () {
        // 模拟异步加载
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 4000);
            setTimeout(() => {
                // 模拟 assets 加载完成
                isReady = true;
                Editor.Ipc.sendToAll('asset-db:ready');
            }, 8000);
        });
    },

    unload () {

    },
};