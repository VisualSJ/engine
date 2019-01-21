'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import { init } from './vm';

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../../dist/index.css'));

export const template = readFileSync(join(__dirname, '../../static', '/template/index.html'));

/**
 * 配置 inspector 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'inspector',
        file: 'packages://inspector/static/style/imports/iconfont.woff',
    },
];

export const $ = {
    content: '.content',
};

export const messages = {
    /**
     * 场景已准备
     */
    'scene:ready'() {
        if (!vm) {
            return;
        }
        vm.state.scene = 'ready';
    },

    /**
     * 场景已关闭
     */
    'scene:close'() {
        if (!vm) {
            return;
        }
        vm.state.scene = 'close';
    },

    /**
     * asset-db 已准备
     */
    'asset-db:ready'() {
        if (!vm) {
            return;
        }
        vm.state.db = 'ready';
    },

    /**
     * asset-db 已关闭
     */
    'asset-db:close'() {
        if (!vm) {
            return;
        }
        vm.state.db = 'close';
    },

    /**
     * 选中某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:select'(type: string, uuid: string) {
        if (!vm) {
            return;
        }
        vm.item.type = type;
        vm.item.uuid = uuid;
    },

    /**
     * 取消选中某个物体
     * @param type
     * @param uuid
     */
    'selection:unselect'(type: string, uuid: string) {
        if (vm.item.type === type && vm.item.uuid === uuid) {
            vm.item.type = '';
            vm.item.uuid = '';
        }
    },
    /**
     * 比对节点根据diff结果修改
     * @param {string} uuid
     */
    async 'scene:node-changed'(uuid: string) {
        vm.$refs.node && vm.$refs.node.refresh();
    },

    /**
     * effect 更新广播
     * @param uuid
     */
    async 'scene:effect-update'(uuid: string) {

    },
};

export const listeners = {
    resize() {
        vm && vm.resize();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    vm = init(panel.$.content);

    const type = await Editor.Ipc.requestToPackage('selection', 'query-last-select-type');
    const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', type);

    vm.item.type = type;
    vm.item.uuid = uuid;

    if (await Editor.Ipc.requestToPackage('asset-db', 'query-ready')) {
        vm.state.db = 'ready';
    }
    if (await Editor.Ipc.requestToPackage('scene', 'query-is-ready')) {
        vm.state.scene = 'ready';
    }
}

export async function beforeClose() {}

export async function close() {}
