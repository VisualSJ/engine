'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

window.customElements.define('engine-view', require('../static/script/engine-element.js'));

let isAssetReady: boolean = false;
let panel: any = null;
let currentSceneUuid: string | null = null;
const profile = Editor.Profile.load('profile://local/packages/scene.json');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',

    scene: '.scene',

    path: 'footer .path',
    version: 'footer .version'
};

export const listeners = {
    /**
     * panel 页面大小改变触发的事件
     */
    resize() {
        // @ts-ignore
        window.app && window.app.resize();
    }
};

export const methods = {
    /**
     * 打开场景
     * @param uuid
     */
    async openScene(uuid: string) {
        currentSceneUuid = uuid;
        Editor.Ipc.requestToPackage('scene', 'change-scene-uuid', currentSceneUuid);
        await panel.$.scene.openScene(uuid);
        // 重置历史操作数据
        panel.resetHistory();
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
        currentSceneUuid = null;
        Editor.Ipc.requestToPackage('scene', 'change-scene-uuid', currentSceneUuid);
        await panel.$.scene.closeScene();
        Editor.Ipc.sendToAll('scene:close');
    },

    /**
     * 操作记录：重置历史记录
     */
    resetHistory() {
        panel.$.scene.resetHistory();
    },

    /**
     * 操作记录：保存受影响的 uuid
     */
    recordHistory(uuid: string) {
        panel.$.scene.recordHistory(uuid);
    },

    /**
     * 操作记录：正式保存一次操作记录
     */
    snapshot() {
        panel.$.scene.snapshot();
    },

    /**
     * 操作记录：撤销一步操作
     */
    async undo() {
        const result = await panel.$.scene.undo();
        if (result === true) {
            Editor.Ipc.sendToAll('scene:refresh');
        }
    },

    /**
     * 操作记录：重做一步操作
     */
    async redo() {
        const result = await panel.$.scene.redo();
        if (result === true) {
            Editor.Ipc.sendToAll('scene:refresh');
        }
    },
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
        panel.recordHistory(options.uuid);
        const key = (options.path || '').split('.').pop();
        // 广播节点被修改的消息
        if (key === 'parent') {
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
        panel.recordHistory(options.uuid);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 移动数组类型 property 内的某个 item 的位置
     * @param options 移动节点的参数
     */
    async 'move-array-element'(options: MoveArrayOptions) {
        await panel.$.scene.moveArrayElement(options);
        panel.recordHistory(options.uuid);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 删除数组类型 property 内的某个 item 的位置
     * @param options 移动节点的参数
     */
    async 'remove-array-element'(options: RemoveArrayOptions) {
        await panel.$.scene.removeArrayElement(options);
        panel.recordHistory(options.uuid);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 创建一个新的节点
     * @param options 创建节点的参数
     * @return {Stirng} 返回新建的节点的 uuid
     */
    async 'create-node'(options: CreateNodeOptions) {
        const rt = await panel.$.scene.createNode(options);
        panel.recordHistory(rt.parentUuid);
        panel.recordHistory(rt.uuid);
        Editor.Ipc.sendToAll('scene:node-created', rt.uuid);
    },

    /**
     * 删除一个已有的节点
     * @param options 删除节点的参数
     */
    async 'remove-node'(options: RemoveNodeOptions) {
        const parentUuid = await panel.$.scene.removeNode(options);
        panel.recordHistory(parentUuid);
        Editor.Ipc.sendToAll('scene:node-removed', options.uuid);
    },

    /**
     * 创建一个新的组件
     * @param options 创建组件的参数
     */
    async 'create-component'(options: CreateComponentOptions) {
        await panel.$.scene.createComponent(options);
        panel.recordHistory(options.uuid);
        Editor.Ipc.sendToAll('scene:node-changed', options.uuid);
    },

    /**
     * 移除一个节点上的组件
     * @param options 移除组件的参数
     */
    async 'remove-component'(options: RemoveComponentOptions) {
        await panel.$.scene.removeComponent(options);
        panel.recordHistory(options.uuid);
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
     * 查询一个节点的 dump 信息
     * @param uuid 查询节点的 uuid
     */
    async 'query-node-path'(uuid: string) {
        return await panel.$.scene.queryNodePath(uuid);
    },

    /**
     * 查询当前场景内的节点树
     * 节点树并不会显示所有的 dump 数据
     * @param uuid 查询节点的 uuid
     */
    async 'query-node-tree'(uuid: string) {
        return await panel.$.scene.queryNodeTree(uuid);
    },

    /**
     * 保存一步操作记录
     */
    snapshot() {
        panel.snapshot();
    },

    /**
     * 撤销一步操作
     */
    undo() {
        panel.undo();
    },

    /**
     * 重做一步操作
     */
    redo() {
        panel.redo();
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
export async function beforeClose() {
    if (panel.$.scene.dirty) {
        const code = await Editor.Dialog.show({
            title: Editor.I18n.t('scene.messages.waning'),
            message: Editor.I18n.t('scene.messages.scenario_modified'),
            detail: Editor.I18n.t('scene.messages.want_to_save'),
            type: 'warning',

            default: 0,
            cancel: 2,

            buttons: [
                Editor.I18n.t('scene.messages.save'),
                Editor.I18n.t('scene.messages.dont_save'),
                Editor.I18n.t('scene.messages.cancel'),
            ],
        });

        switch (code) {
            case 2:
                return false;
            case 0:
                await panel.$.scene.saveScene();
                return true;
        }
    }
}

/**
 * 面板关闭的时候，场景也会注销
 * 所以要发送场景关闭事件
 */
export async function close() {
    panel.closeScene();
}
