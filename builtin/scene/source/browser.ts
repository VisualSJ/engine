'use strict';

let pkg: any = null;
let isReady: boolean = false;

export const messages = {
    open () {
        Editor.Panel.open('scene');
    },

    /**
     * 场景面板准备完成
     */
    'scene:ready' () {
        isReady = true;
    },

    /**
     * 场景面板关闭了场景
     */
    'scene:close' () {
        isReady = false;
    },

    /**
     * 监听消息
     * ${action}-${method}
     * 
     * 场景主要引擎处理逻辑都在 panel，主进程只是负责数据转发
     */

     /**
      * 查询场景编辑器是否准备就绪
      */
    'query-is-ready' (event: IPCEvent) {
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
};

export function load () {
    // @ts-ignore
    pkg = this;
};

export function unload () {};