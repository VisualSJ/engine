'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

window.customElements.define('engine-view', require('../static/script/engine-element.js'));

let isAssetReady: boolean = false;
let panel: any = null;

const profile = Editor.Profile.load('profile://local/packages/scene.json');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',

    scene: '.scene',

    path: 'footer .path',
    version: 'footer .version',
};

export const listeners = {
    /**
     * panel 页面大小改变触发的事件
     */
    resize() {
        // @ts-ignore
        window.app && window.app.resize();
    },
};

export const methods = {
    /**
     * 打开场景
     * @param uuid
     */
    async openScene(uuid: string) {
        await panel.$.scene.openScene(uuid);
        Editor.Ipc.sendToAll('scene:ready');
    },

    /**
     * 保存场景
     */
    async saveScene() {
        await panel.$.scene.saveScene();
        Editor.Ipc.sendToAll('scene:save');
    },

    /**
     * 关闭场景
     */
    async closeScene() {
        await panel.$.scene.closeScene();
        Editor.Ipc.sendToAll('scene:close');
    }
};

export const messages = {

    'scene:ready'() {
        panel.$.loading.hidden = true;
    },
    'scene:close'() {
        panel.$.loading.hidden = false;
    },

    /**
     * 资源数据库准备就绪
     */
    async 'asset-db:ready'() {
        isAssetReady = true;
        const uuid = profile.get('current-scene');
        await panel.openScene(uuid);
    },

    /**
     * 资源数据库关闭
     */
    async 'asset-db:close'() {
        isAssetReady = false;
        await panel.closeScene();
    },

    /**
     * 选中物体事件
     */
    async 'selection:select'(type: string, uuid: string) {
        if (type !== 'node') {
            return;
        }

        const path = await panel.$.scene.queryNodePath(uuid);
        panel.__selectUuid = uuid;
        panel.$.path.innerHTML = path.replace(/^\//, '');
    },

    /**
     * 取消选中物体
     */
    'selection:unselect'(type: string, uuid: string) {
        if (type !== 'node') {
            return;
        }
        if (panel.__selectUuid === uuid) {
            panel.__selectUuid = '';
            panel.$.path.innerHTML = '';
        }
    },

    /**
     * 切换调试模式
     */
    'open-devtools'() {
        panel.$.scene.openDevTools(true);
    },

    /////////////////////
    // 场景操作

    /**
     * 打开场景
     * @param uuid 打开场景的 uuid
     */
    async 'open-scene'(uuid: string) {
        // 关闭当前场景
        await panel.closeScene();

        // 如果 asset 没有准备好, 则忽略后续操作
        if (!isAssetReady) {
            return;
        }
        await panel.openScene(uuid);

        // 保存最后一个打开的场景
        profile.set('current-scene', uuid);
        profile.save();
    },

    /**
     * 保存场景
     */
    async 'save-scene'() {
        await panel.saveScene();
    },

    /**
     * 关闭当前场景
     */
    async 'close-scene'() {
        await panel.closeScene();
    },

    /////////////////////
    // 修改场景内数据的消息

    /**
     * 设置某个元素内的属性
     * @param options 设置节点的参数
     */
    async 'set-property'(options: SetPropertyOptions) {
        await panel.$.scene.setProperty(options);

        // 广播节点被修改的消息
        if (options.key === 'parent') {
            const node = await panel.$.scene.queryNode(options.uuid);
            Editor.Ipc.sendToAll('node-changed', node.parent.value);
        }
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 插入一个 item 到某个数组类型的 property 内
     * @param options
     */
    async 'insert-array-element'(options: InsertArrayOptions) {
        await panel.$.scene.insertArrayProperty(options);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 移动数组类型 property 内的某个 item 的位置
     * @param options 移动节点的参数
     */
    async 'move-array-element'(options: MoveArrayOptions) {
        await panel.$.scene.moveArrayProperty(options);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 删除数组类型 property 内的某个 item 的位置
     * @param options 移动节点的参数
     */
    async 'remove-array-element'(options: RemoveArrayOptions) {
        await panel.$.scene.removeArrayProperty(options);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 创建一个新的节点
     * @param options 创建节点的参数
     * @return {Stirng} 返回新建的节点的 uuid
     */
    async 'create-node'(options: CreateNodeOptions) {
        const uuid = await panel.$.scene.createNode(options);
        Editor.Ipc.sendToAll('scene:node-created', uuid);
    },

    /**
     * 删除一个已有的节点
     * @param options 删除节点的参数
     */
    async 'remove-node'(options: RemoveNodeOptions) {
        await panel.$.scene.removeNode(options);
        Editor.Ipc.sendToAll('scene:node-removed', options.uuid);
    },

    /**
     * 创建一个新的组件
     * @param options 创建组件的参数
     */
    async 'create-component'(options: CreateComponentOptions) {
        await panel.$.scene.createComponent(options);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 移除一个节点上的组件
     * @param options 移除组件的参数
     */
    async 'remove-component'(options: RemoveComponentOptions) {
        await panel.$.scene.removeComponent(options);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /////////////////////
    // 查询场景内的数据的消息

    /**
     * 查询一个节点的 dump 信息
     * @param uuid 查询节点的 uuid
     */
    async 'query-node'(uuid: string) {
        return await panel.$.scene.queryNode(uuid);
    },

    /**
     * 查询当前场景内的节点树
     * 节点树并不会显示所有的 dump 数据
     * @param uuid 查询节点的 uuid
     */
    async 'query-node-tree'(uuid: string) {
        return await panel.$.scene.queryNodeTree(uuid);
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    // 检查 asset db 是否准备就绪
    isAssetReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');

    // 初始化引擎管理器
    await panel.$.scene.init();

    // 显示版本号
    panel.$.version.innerHTML = 'Version: ' + panel.$.scene.version;

    if (isAssetReady) {
        const uuid = profile.get('current-scene');
        await panel.openScene(uuid);
    }
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
    panel.closeScene();
}
