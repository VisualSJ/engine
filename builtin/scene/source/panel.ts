'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import {
    close as closeScene,
    initEngineManager,
    open as openScene,
    queryNodeTree,
} from './manager/scene';

import {
    dump as dumpNode,
    exists as nodeExists,
    moveProperty as moveNodeProperty,
    setProperty as setNodeProperty
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
        app && app.resize();
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

    /**
     * 创建新场景
     */
    'create-scene'() {},

    /**
     * 创建新节点
     */
    'create-node'() {},

    /**
     * 设置某个元素内的属性
     * @param options 设置节点的参数
     */
    'set-property'(options: SetPropertyOptions) {
        if (nodeExists(options.uuid)) {
            setNodeProperty(options.uuid, options.path, options.key, options.dump);
            return;
        }
    },

    /**
     * 移动数组类型 property 内的某个 item 的位置
     * @param options 移动节点的参数
     */
    'move-array-element'(options: MovePropertyOptions) {
        if (nodeExists(options.uuid)) {
            moveNodeProperty(options.uuid, options.path, options.key, options.target, options.offset);
            return;
        }
    },

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
