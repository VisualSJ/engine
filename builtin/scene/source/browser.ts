'use strict';

let isReady: boolean = false;

export const messages = {
    /**
     * 打开面板
     */
    'open'() {
        Editor.Panel.open('scene');
    },

    /**
     * 面板准备完成
     */
    'scene:ready'() {
        isReady = true;
    },

    /**
     * 面板关闭了场景
     */
    'scene:close'() {
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
    'query-is-ready'() {
        return isReady;
    },

    /**
     * 打开场景
     * @param uuid 打开场景的 uuid
     */
    async 'open-scene'(uuid: string) {
        return await Editor.Ipc.sendToPanel('scene', 'open-scene', uuid);
    },

    /**
     * 设置节点的属性
     * @param options 设置节点属性的参数
     */
    async 'set-property'(options: SetPropertyOptions) {
        return await Editor.Ipc.requestToPanel('scene', 'set-property', options);
    },

    /**
     * 插入一个 item 到某个数组类型的 property 内
     * @param options
     */
    async 'insert-array-element'(options: InsertArrayOptions) {
        return await Editor.Ipc.requestToPanel('scene', 'insert-array-element', options);
    },

    /**
     * 移动数组类型属性内某个 item 的位置
     * @param options 移动节点属性的参数
     */
    async 'move-array-element'(options: MoveArrayOptions) {
        return await Editor.Ipc.requestToPanel('scene', 'move-array-element', options);
    },

    /**
     * 删除数组类型 property 内的某个 item 的位置
     * @param options 删除节点的参数
     */
    async 'remove-array-element'(options: RemoveArrayOptions) {
        return await Editor.Ipc.requestToPanel('scene', 'remove-array-element', options);
    },

    /**
     * 查询一个节点的 dump 信息
     * @param uuid 查询节点的 uuid
     */
    async 'query-node'(uuid: string) {
        return await Editor.Ipc.requestToPanel('scene', 'query-node', uuid);
    },

    /**
     * 查询当前场景内的节点树
     */
    async 'query-node-tree'() {
        return await Editor.Ipc.requestToPanel('scene', 'query-node-tree');
    }
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() { }
