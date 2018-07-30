'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

import { 
    initEngineManager,
    dump as dumpNode,
    open as openScene,
    close as closeScene,
} from './manager/scene';

const Vue = require('vue/dist/vue.js');

let isReady: boolean = false;
let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',
};

export const listeners = {
    resize () {
        // @ts-ignore
        app && app.resize();
    },
};

export const methods = {};

export const messages = {
    /**
     * 资源数据库准备就绪
     */
    'asset-db:ready' () {
        isReady = true;
    },
    'asset-db:close' () {
        isReady = false;
    },

    /**
     * 打开场景
     */
    async 'open-scene' (event: IPCEvent, uuid: string) {
        // 关闭当前场景
        Editor.Ipc.sendToAll('scene:close');
        panel.$.loading.hidden = false;
        await closeScene();

        // 打开新的场景
        isReady && await openScene(uuid);
        Editor.Ipc.sendToAll('scene:ready');
        panel.$.loading.hidden = true;
    },

    /**
     * 关闭当前场景
     */
    async 'close-scene' () {
        Editor.Ipc.sendToAll('scene:close');
        panel.$.loading.hidden = false;
        await closeScene();
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
    'set-node-property' (event: IPCEvent) {},

    /**
     * 设置节点的索引（调整在父节点内的位置）
     */
    'set-node-index' (event: IPCEvent) {},

    /**
     * 查询一个节点的 dump 信息
     */
    'query-node' (event: IPCEvent, uuid: string) {
        let dump;
        try {
            dump = dumpNode(uuid);
        } catch (error) {
            return event.reply(error, null);
        }
        event.reply(null, dump);
    },

    /**
     * 查询当前场景内的节点树
     */
    'query-node-tree' (event: IPCEvent) {
        let dump;
        try {
            dump = dumpNode(null);
        } catch (error) {
            console.log(error)
            return event.reply(error, null);
        }
        event.reply(null, dump);
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    initEngineManager(panel.$.content);

    isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
};

export async function beforeClose () {};

export async function close () {
    Editor.Ipc.sendToAll('scene:close');
    panel.$.loading.hidden = false;
    await closeScene();
};