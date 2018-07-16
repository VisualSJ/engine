'use strict';

//////////////////
// 场景相关功能插件

let isReady = false;

module.exports = {

    messages: {

        open () {
            Editor.Panel.open(this.name);
        },

        'scene:ready' () {
            isReady = true;
        },

        'scene:close' () {
            isReady = false;
        },

        /**
         * 监听消息
         * ${action}-${method}
         * 
         * 场景主要引擎处理逻辑都在 panel，主进程只是负责数据转发
         */

        'query-is-ready' (event) {
            event.reply(null, isReady);
        },

        'open-scene' () {},
        'open-prefab' () {},

        'create-scene' () {},
        'create-node' () {},
        'create-prefab' () {},

        'set-node-property' () {},
        'set-node-index' () {},

        'select-node' () {},
        'unselect-node' () {},

        'query-node' () {},
    },

    /**
     * 插件加载的时候触发的函数
     */
    load () {
        
    },

    /**
     * 插件卸载的时候触发的函数
     */
    unload () {

    },
};