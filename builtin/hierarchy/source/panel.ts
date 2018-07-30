'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

let panel: any = null;
let vm: any = null;

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    content: '.content',
};

export const methods = {

    /**
     * 刷新显示面板
     */
    async refresh () {
        let tree = [];
        try {
            tree = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');
        } catch (error) {
            console.warn(error);
        }

        vm.list = tree;
    }
};

export const messages = {

    /**
     * 场景准备就绪
     */
    'scene:ready' () {
        vm.ready = true;
        panel.refresh();
    },

    /**
     * 关闭场景
     */
    'scene:close' () {
        vm.ready = false;
        vm.list = [];
    },

    /**
     * 选中了某个物体
     */
    'selection:select' (event: IPCEvent, type: string, uuid: string) {
        if (type !== 'node') {
            return;
        }
        let index = vm.select.indexOf(uuid);
        if (index === -1) {
            vm.select.push(uuid);
        }
    },

    /**
     * 取消选中了某个物体
     */
    'selection:unselect' (event: IPCEvent, type: string, uuid: string) {
        if (type !== 'node') {
            return;
        }
        let index = vm.select.indexOf(uuid);
        if (index !== -1) {
            vm.select.splice(index, 1);
        }
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    let isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

    vm = new Vue({
        el: panel.$.content,
        data: {
            ready: isReady,
            list: [],
            select: [],
        },
        components: {
            tree: require('./components/tree'),
        },
        methods: {},
    });

    // 场景就绪状态才需要查询数据
    isReady && panel.refresh();
};

export async function beforeClose () {}

export async function close () {}
