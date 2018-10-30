'use strict';

let isReady: boolean = false;
let currentSceneUuid: string | null = null;

export const messages = {
    /**
     * 打开面板
     */
    open() {
        Editor.Panel.open('scene');
    },
    /**
     * 查询当前场景 uuid
     */
    'query-current-scene'() {
        return currentSceneUuid;
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
     * 切换调试模式
     */
    'open-devtools'() {
        Editor.Ipc.sendToPanel('scene', 'open-devtools');
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
    async 'change-scene-uuid'(uuid: string) {
        currentSceneUuid = uuid;
    },

    /**
     * 打开场景
     * @param uuid 打开场景的 uuid
     */
    async 'open-scene'(uuid: string) {
        currentSceneUuid = uuid;
        return await Editor.Ipc.sendToPanel('scene', 'open-scene', uuid);
    },

    /**
     * 保存场景
     */
    async 'save-scene'() {
        return await Editor.Ipc.sendToPanel('scene', 'save-scene');
    },

    /**
     * 关闭当前场景
     */
    async 'close-scene'() {
        currentSceneUuid = null;
        return await Editor.Ipc.sendToPanel('scene', 'close-scene');
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
    'insert-array-element'(options: InsertArrayOptions) {
        Editor.Ipc.sendToPanel('scene', 'insert-array-element', options);
    },

    /**
     * 移动数组类型属性内某个 item 的位置
     * @param options 移动节点属性的参数
     */
    'move-array-element'(options: MoveArrayOptions) {
        Editor.Ipc.sendToPanel('scene', 'move-array-element', options);
    },

    /**
     * 删除数组类型 property 内的某个 item 的位置
     * @param options 删除节点的参数
     */
    'remove-array-element'(options: RemoveArrayOptions) {
        Editor.Ipc.sendToPanel('scene', 'remove-array-element', options);
    },

    /**
     * 创建一个新的节点
     * @param options 创建节点的参数
     * @return {Stirng} 返回新建的节点的 uuid
     */
    async 'create-node'(options: CreateNodeOptions) {
        return await Editor.Ipc.requestToPanel('scene', 'create-node', options);
    },

    /**
     * 删除一个已有的节点
     * @param options 删除节点的参数
     */
    'remove-node'(options: RemoveNodeOptions) {
        Editor.Ipc.requestToPanel('scene', 'remove-node', options);
    },

    /**
     * 创建一个新的组件
     * @param options 创建组件的参数
     */
    'create-component'(options: CreateComponentOptions) {
        Editor.Ipc.requestToPanel('scene', 'create-component', options);
    },

    /**
     * 移除一个节点上的组件
     * @param options 移除组件的参数
     */
    'remove-component'(options: RemoveComponentOptions) {
        Editor.Ipc.requestToPanel('scene', 'remove-component', options);
    },

    /**
     * 查询一个节点的 dump 信息
     * @param uuid 查询节点的 uuid
     */
    async 'query-node'(uuid: string) {
        return await Editor.Ipc.requestToPanel('scene', 'query-node', uuid);
    },

    /**
     * 查询一个节点的 dump 信息
     * @param uuid 查询节点的 uuid
     */
    async 'query-node-path'(uuid: string) {
        return await Editor.Ipc.requestToPanel('scene', 'query-node-path', uuid);
    },

    /**
     * 查询当前场景内的节点树
     */
    async 'query-node-tree'() {
        return await Editor.Ipc.requestToPanel('scene', 'query-node-tree');
    }
};

export function load() {
    require('electron').protocol.registerFileProtocol('import', (request: any, cb: any) => {
        const url = decodeURIComponent(request.url);
        const uri = require('url').parse(url);
        const path = require('path');
        const result = path.join(Editor.Project.path, 'library', uri.host, uri.path);
        cb({ path: result });
    });

    const projectScripts = require('./protocol/project-scripts');
    require('electron').protocol
        .registerStringProtocol('project-scripts', projectScripts.handler, projectScripts.error);
}

export function unload() {}
