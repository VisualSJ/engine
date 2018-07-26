'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

let panel: any = null;
let vm: any = null;

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../static', '/style/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',
};

export const methods = {

    /**
     * 刷新显示面板
     */
    async refresh () {
        let tree = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');
        vm.list = tree;
    }
};

export const messages = {

    /**
     * 场景准备就绪
     */
    'scene:ready' () {
        panel.$.loading.hidden = true;
        panel.refresh();
    },

    /**
     * 关闭场景
     */
    'scene:close' () {
        panel.$.loading.hidden = false;
        vm.list = [];
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    let isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');
    panel.$.loading.hidden = isReady;

    vm = new Vue({
        el: panel.$.content,
        data: {
            ready: isReady,
            list: [],
        },
        methods: {},
    });

    // 场景就绪状态才需要查询数据
    isReady && panel.refresh();
};

export async function beforeClose () {}

export async function close () {}
