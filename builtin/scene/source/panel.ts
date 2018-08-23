'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import {
    close as closeScene,
    createNode,
    initEngineManager,
    open as openScene,
    queryNodeTree,
    removeNode,
} from './manager/scene';

import {
    createComponent,
    dump as dumpNode,
    insertArrayProperty as insertNodeArrayProperty,
    moveArrayProperty as moveNodeArrayProperty,
    removeArrayProperty as removeNodeArrayProperty,
    removeComponent,
    setProperty as setNodeProperty,
} from './manager/node';

let isAssetReady: boolean = false;
let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',
};

export const listeners = {
    resize() {
        // @ts-ignore
        window.app && window.app.resize();
    },
};

export const methods = {};

export const messages = {
    /**
     * 资源数据库准备就绪
     */
    'asset-db:ready'() {
        isAssetReady = true;
    },

    /**
     * 资源数据库关闭
     */
    'asset-db:close'() {
        isAssetReady = false;
    },

    /////////////////////
    // 场景操作

    /**
     * 打开场景
     * @param uuid 打开场景的 uuid
     */
    async 'open-scene'(uuid: string) {
        // 关闭当前场景
        Editor.Ipc.sendToAll('scene:close');
        panel.$.loading.hidden = false;
        await closeScene();

        // 打开新的场景
        isAssetReady && await openScene(uuid);
        Editor.Ipc.sendToAll('scene:ready');
        panel.$.loading.hidden = true;
    },

    /**
     * 关闭当前场景
     */
    async 'close-scene'() {
        Editor.Ipc.sendToAll('scene:close');
        panel.$.loading.hidden = false;
        await closeScene();
    },

    /////////////////////
    // 修改场景内数据的消息

    /**
     * 设置某个元素内的属性
     * @param options 设置节点的参数
     */
    'set-property'(options: SetPropertyOptions) {
        setNodeProperty(options.uuid, options.path, options.key, options.dump);
    },

    /**
     * 插入一个 item 到某个数组类型的 property 内
     * @param options
     */
    'insert-array-element'(options: InsertArrayOptions) {
        insertNodeArrayProperty(options.uuid, options.path, options.key, options.index, options.dump);
    },

    /**
     * 移动数组类型 property 内的某个 item 的位置
     * @param options 移动节点的参数
     */
    'move-array-element'(options: MoveArrayOptions) {
        moveNodeArrayProperty(options.uuid, options.path, options.key, options.target, options.offset);
    },

    /**
     * 删除数组类型 property 内的某个 item 的位置
     * @param options 移动节点的参数
     */
    'remove-array-element'(options: RemoveArrayOptions) {
        removeNodeArrayProperty(options.uuid, options.path, options.key, options.index);
    },

    /**
     * 创建一个新的节点
     * @param options 创建节点的参数
     * @return {Stirng} 返回新建的节点的 uuid
     */
    'create-node'(options: CreateNodeOptions) {
        return createNode(options.parent, options.name);
    },

    /**
     * 删除一个已有的节点
     * @param options 删除节点的参数
     */
    'remove-node'(options: RemoveNodeOptions) {
        removeNode(options.uuid);
    },

    /**
     * 创建一个新的组件
     * @param options 创建组件的参数
     */
    'create-component'(options: CreateComponentOptions) {
        createComponent(options.uuid, options.component);
    },

    /**
     * 移除一个节点上的组件
     * @param options 移除组件的参数
     */
    'remove-component'(options: RemoveComponentOptions) {
        removeComponent(options.uuid, options.component);
    },

    /////////////////////
    // 查询场景内的数据的消息

    /**
     * 查询一个节点的 dump 信息
     * @param uuid 查询节点的 uuid
     */
    'query-node'(uuid: string) {
        return dumpNode(uuid);
    },

    /**
     * 查询当前场景内的节点树
     * 节点树并不会显示所有的 dump 数据
     */
    'query-node-tree'() {
        return queryNodeTree();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    // 初始化引擎管理器
    initEngineManager(panel.$.content);

    // 检查 asset db 是否准备就绪
    isAssetReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
}

/**
 * 检查关闭阶段需要检查是否场景更改了未保存
 */
export async function beforeClose() {}

/**
 * 面板关闭的时候，场景也会注销
 * 所以要发送场景关闭事件
 */
export async function close() {
    Editor.Ipc.sendToAll('scene:close');
    panel.$.loading.hidden = false;
    await closeScene();
}
