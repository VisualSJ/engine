'use strict';

let pkg: any = null;
let isReady: boolean = false;

export const messages = {
    /**
     * 打开面板
     */
    open () {
        Editor.Panel.open('scene');
    },

    /**
     * 面板准备完成
     */
    'scene:ready' () {
        isReady = true;
    },

    /**
     * 面板关闭了场景
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

    /**
     * 打开场景
     */
    'open-scene' (event: IPCEvent, uuid: string) {
        Editor.Ipc.sendToPanel('scene', 'open-scene', uuid);
    },

    /**
     * 创建新场景
     */
    'create-scene' (event: IPCEvent) {},

    /**
     * 创建新节点
     */
    'create-node' (event: IPCEvent) {},

    /**
     * 设置节点的属性
     */
    'set-property' (event: IPCEvent, options: SetPropertyOptions) {
        Editor.Ipc.sendToPanel('scene', 'set-property', options);
    },

    /**
     * 移动数组类型属性内某个 item 的位置 
     */
    'move-array-element' (event: IPCEvent, options: MovePropertyOptions) {
        Editor.Ipc.sendToPanel('scene', 'move-array-element', options);
    },

    /**
     * 查询一个节点的 dump 信息
     */
    async 'query-node' (event: IPCEvent, uuid: string) {
        let dump = await Editor.Ipc.requestToPanel('scene', 'query-node', uuid);
        event.reply(null, dump);
    },

    /**
     * 查询当前场景内的节点树
     */
    async 'query-node-tree' (event: IPCEvent) {
        let tree = await Editor.Ipc.requestToPanel('scene', 'query-node-tree');
        event.reply(null, tree);
    },
};

export function load () {
    // @ts-ignore
    pkg = this;
};

export function unload () {};